import SoundSpinAlt from "../../assets/audio/surecoin/coinspin-2.mp3";
import SoundWin from "../../assets/audio/surecoin/coin-win.mp3";
import SoundSpinDefault from "../../assets/audio/surecoin/coin-spin.mp3";

const STORAGE_KEY = "surecoin_audio_unlocked";
const SPIN_GAIN = 0.85;
const SETTLE_MS = 520;
const SPIN_RATE = 1.12;
const SETTLE_RATE_END = 0.28;

export const SURECOIN_SPIN_SOUND_OPTIONS = {
  "coin-spin": {
    label: "Coin Spin",
    src: SoundSpinDefault,
    // coin-spin.mp3 has ~620ms leading dead air before the audible attack.
    // startOffset skips that so the flip hears the click/roll immediately.
    startOffset: 0.62,
    loopStart: 0.62,
    loopEndPadding: 0.38,
  },
  "coinspin-2": {
    label: "Coin Spin 2",
    src: SoundSpinAlt,
    startOffset: 0,
    loopStart: 0.15,
    loopEndPadding: 0.2,
  },
};

// Active rolling/spinning loop: coin-spin.mp3 (src/assets/audio/surecoin/coin-spin.mp3).
export const ACTIVE_SURECOIN_SPIN_SOUND_KEY = "coin-spin";

let unlocked = false;
let winAudio = null;
let audioCtx = null;
let masterGain = null;
const spinBuffers = new Map();
const spinBufferPromises = new Map();
let spinSource = null;
let spinGain = null;
let spinPhase = "off"; // "off" | "spin" | "settle"
let settleRaf = null;
let settleToken = 0;
/** True while UI wants the spin loop (survives async load / unlock timing). */
let spinWanted = false;
let spinWantedKey = ACTIVE_SURECOIN_SPIN_SOUND_KEY;
let spinStartToken = 0;
/** Source started while AudioContext was suspended — must recreate after unlock. */
let spinNeedsRestart = false;

const getSpinSoundOption = (soundKey = ACTIVE_SURECOIN_SPIN_SOUND_KEY) =>
  SURECOIN_SPIN_SOUND_OPTIONS[soundKey] ||
  SURECOIN_SPIN_SOUND_OPTIONS[ACTIVE_SURECOIN_SPIN_SOUND_KEY] ||
  Object.values(SURECOIN_SPIN_SOUND_OPTIONS)[0];

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
};

const markUnlocked = () => {
  const wasUnlocked = unlocked || sessionStorage.getItem(STORAGE_KEY) === "1";
  unlocked = true;
  sessionStorage.setItem(STORAGE_KEY, "1");
  if (!wasUnlocked) {
    window.dispatchEvent(new Event("surecoin:sound-unlocked"));
  }
};

const ensureMasterGainSync = () => {
  const ctx = getAudioContext();
  if (!masterGain) {
    masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === "running") {
    markUnlocked();
  }
  return masterGain;
};

const ensureMasterGain = async () => {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch (err) {
      // autoplay policy — caller may retry after a user gesture
    }
  }
  return ensureMasterGainSync();
};

const loadSpinBuffer = async (soundKey = ACTIVE_SURECOIN_SPIN_SOUND_KEY) => {
  if (spinBuffers.has(soundKey)) {
    return spinBuffers.get(soundKey);
  }

  if (!spinBufferPromises.has(soundKey)) {
    spinBufferPromises.set(
      soundKey,
      (async () => {
        const { src } = getSpinSoundOption(soundKey);
        const ctx = getAudioContext();
        const res = await fetch(src);
        if (!res.ok) {
          throw new Error(`Failed to fetch spin sound: ${res.status}`);
        }
        const raw = await res.arrayBuffer();
        const buffer = await ctx.decodeAudioData(raw.slice(0));
        spinBuffers.set(soundKey, buffer);
        // If the flip already asked for audio while we were decoding, start
        // in this same turn — don't wait for a separate awaiter tick.
        if (
          spinWanted &&
          spinWantedKey === soundKey &&
          spinPhase !== "spin"
        ) {
          try {
            startSpinLoopFromBuffer(soundKey, buffer);
          } catch (err) {
            // ignore
          }
        }
        return buffer;
      })().catch((err) => {
        spinBufferPromises.delete(soundKey);
        throw err;
      })
    );
  }

  return spinBufferPromises.get(soundKey);
};

/** Kick off fetch+decode early so spin start is not waiting on network/decode. */
export const preloadSurecoinSpinSound = (
  soundKey = ACTIVE_SURECOIN_SPIN_SOUND_KEY
) => {
  try {
    getAudioContext();
    const p = loadSpinBuffer(soundKey);
    if (p && typeof p.catch === "function") {
      p.catch(() => {});
    }
    return p;
  } catch (err) {
    return Promise.resolve(null);
  }
};

// Begin decode as soon as this module is evaluated (page load of Surecoin).
preloadSurecoinSpinSound(ACTIVE_SURECOIN_SPIN_SOUND_KEY);

const cancelSettleRaf = () => {
  if (settleRaf != null) {
    cancelAnimationFrame(settleRaf);
    settleRaf = null;
  }
};

const stopSpinSource = () => {
  cancelSettleRaf();
  if (spinSource) {
    try {
      spinSource.onended = null;
      spinSource.stop(0);
    } catch (err) {
      // already stopped
    }
    try {
      spinSource.disconnect();
    } catch (err) {
      // ignore
    }
    spinSource = null;
  }
  if (spinGain) {
    try {
      spinGain.disconnect();
    } catch (err) {
      // ignore
    }
    spinGain = null;
  }
  spinPhase = "off";
  spinNeedsRestart = false;
};

const startSpinLoopFromBuffer = (soundKey, buffer) => {
  const ctx = getAudioContext();
  ensureMasterGainSync();

  stopSpinSource();

  if (!spinWanted) {
    return false;
  }

  const option = getSpinSoundOption(soundKey);
  // Clamp into the audible region; never land in the trailing fade/silence.
  const maxOffset = Math.max(0, buffer.duration - 0.05);
  const startOffset = Math.max(
    0,
    Math.min(option.startOffset || 0, maxOffset)
  );

  spinGain = ctx.createGain();
  spinGain.gain.value = SPIN_GAIN;
  spinGain.connect(masterGain);

  spinSource = ctx.createBufferSource();
  spinSource.buffer = buffer;
  spinSource.loop = true;
  if (buffer.duration > 1.2) {
    const { loopStart = startOffset, loopEndPadding = 0.2 } = option;
    // Keep loop inside the audible region (never before startOffset).
    const loopStartSafe = Math.max(startOffset, loopStart);
    const loopEndSafe = Math.min(
      buffer.duration,
      Math.max(loopStartSafe + 0.25, buffer.duration - loopEndPadding)
    );
    spinSource.loopStart = loopStartSafe;
    spinSource.loopEnd = loopEndSafe;
  }
  spinSource.playbackRate.value = SPIN_RATE;
  spinSource.connect(spinGain);
  // when=0 (ASAP), offset=startOffset skips leading silence in the asset.
  spinSource.start(0, startOffset);
  spinPhase = "spin";
  // BufferSources started while suspended often stay silent after resume —
  // flag so unlock recreates the graph once the context is running.
  spinNeedsRestart = ctx.state !== "running";
  return true;
};

const startSpinLoop = async (soundKey = ACTIVE_SURECOIN_SPIN_SOUND_KEY) => {
  const token = ++spinStartToken;
  const ctx = getAudioContext();

  // Prefer sync path when buffer is already decoded — no extra microtask delay.
  let buffer = spinBuffers.get(soundKey);
  if (buffer) {
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch (err) {
        // may still start while suspended; unlock will resume
      }
    }
    if (token !== spinStartToken || !spinWanted) {
      return false;
    }
    return startSpinLoopFromBuffer(soundKey, buffer);
  }

  await ensureMasterGain();
  buffer = await loadSpinBuffer(soundKey);

  // Stale / cancelled while buffer was loading
  if (token !== spinStartToken || !spinWanted) {
    return false;
  }

  // Decode-complete handler may have already started an audible loop.
  if (spinPhase === "spin" && spinSource && !spinNeedsRestart) {
    return true;
  }

  return startSpinLoopFromBuffer(soundKey, buffer);
};

const rampSettleAndStop = () => {
  if (!spinSource || !spinGain) {
    spinPhase = "off";
    return;
  }
  if (spinPhase === "settle") {
    return;
  }
  spinPhase = "settle";
  cancelSettleRaf();
  const token = ++settleToken;
  const ctx = getAudioContext();
  const source = spinSource;
  const gain = spinGain;
  const t0 = performance.now();
  const startRate = source.playbackRate.value || SPIN_RATE;
  const startGain = gain.gain.value;

  const step = (now) => {
    if (token !== settleToken || !spinSource || spinSource !== source) return;
    const p = Math.min(1, (now - t0) / SETTLE_MS);
    // Ease-out: slows like a coin losing energy
    const ease = 1 - Math.pow(1 - p, 2.4);
    const rate = startRate + (SETTLE_RATE_END - startRate) * ease;
    const vol = startGain * (1 - ease);
    try {
      source.playbackRate.setValueAtTime(Math.max(0.05, rate), ctx.currentTime);
      gain.gain.setValueAtTime(Math.max(0, vol), ctx.currentTime);
    } catch (err) {
      source.playbackRate.value = Math.max(0.05, rate);
      gain.gain.value = Math.max(0, vol);
    }
    if (p < 1) {
      settleRaf = requestAnimationFrame(step);
      return;
    }
    stopSpinSource();
  };

  settleRaf = requestAnimationFrame(step);
};

export const isSurecoinAudioUnlocked = () =>
  unlocked || sessionStorage.getItem(STORAGE_KEY) === "1";

/** Call from a click/tap handler - browsers block audio until user gesture. */
export const unlockSurecoinAudio = async () => {
  try {
    await ensureMasterGain();
    const probe = new Audio(SoundWin);
    probe.volume = 0.01;
    await probe.play();
    probe.pause();
    probe.currentTime = 0;
    try {
      await loadSpinBuffer(ACTIVE_SURECOIN_SPIN_SOUND_KEY);
    } catch (err) {
      // defer decode
    }
    markUnlocked();

    // Always recreate the spin graph after a real gesture when the UI wants
    // audio. Resuming a BufferSource that was started while suspended is often
    // still silent in Chrome — restart is the reliable fix.
    if (spinWanted) {
      try {
        if (audioCtx?.state === "suspended") {
          await audioCtx.resume();
        }
        spinNeedsRestart = true;
        await startSpinLoop(spinWantedKey);
      } catch (err) {
        // ignore
      }
    }

    return audioCtx?.state === "running" || isSurecoinAudioUnlocked();
  } catch (err) {
    return false;
  }
};

/**
 * @param {boolean} active
 * @param {boolean} muted
 * @param {{ phase?: "spin" | "settle", soundKey?: string, forceRestart?: boolean }} [opts]
 */
export const setSpinSoundActive = async (active, muted, opts = {}) => {
  const phase = opts.phase === "settle" ? "settle" : "spin";
  const soundKey = opts.soundKey || ACTIVE_SURECOIN_SPIN_SOUND_KEY;
  spinWantedKey = soundKey;

  // Idle / hard off — drop wanted and tear down.
  if (!active) {
    spinWanted = false;
    spinStartToken += 1;
    settleToken += 1;
    stopSpinSource();
    return;
  }

  // Muted but still spinning: keep spinWanted so unmute/unlock can start
  // immediately without waiting for another isspinning edge.
  if (muted) {
    if (phase === "spin") {
      spinWanted = true;
    } else {
      spinWanted = false;
    }
    spinStartToken += 1;
    settleToken += 1;
    stopSpinSource();
    return;
  }

  try {
    if (phase === "spin") {
      spinWanted = true;
      const ctx = getAudioContext();
      const forceRestart = Boolean(opts.forceRestart) || spinNeedsRestart;
      if (
        spinPhase === "spin" &&
        spinSource &&
        !forceRestart &&
        ctx.state === "running"
      ) {
        // already looping audibly — keep continuous
        return;
      }
      // Set spinWanted before any await so a late-arriving decode can start
      // immediately via the same startSpinLoop path (no extra scheduled tick).
      // Do not hard-require the unlocked flag: start the loop whenever possible.
      // If the context is still suspended (no gesture yet), unlock will restart.
      const ready = spinBuffers.get(soundKey);
      if (ready) {
        // Invalidate any in-flight async startSpinLoop from an earlier call.
        spinStartToken += 1;
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
        startSpinLoopFromBuffer(soundKey, ready);
        return;
      }
      await startSpinLoop(soundKey);
      return;
    }

    // Settle: fade/stop the spin loop only — no post-spin land/wobble one-shot.
    spinWanted = false;
    spinStartToken += 1;

    if (spinPhase === "settle" && spinSource) {
      return;
    }

    if (spinPhase === "off" || !spinSource) {
      // Nothing to settle; avoid starting a fresh loop just to stop it.
      stopSpinSource();
      return;
    }
    rampSettleAndStop();
  } catch (err) {
    // ignore autoplay / unlock failures
  }
};

export const playWinSound = async (muted) => {
  if (muted || !isSurecoinAudioUnlocked()) return;

  if (!winAudio) {
    winAudio = new Audio(SoundWin);
    winAudio.preload = "auto";
    winAudio.volume = 1;
  }

  winAudio.currentTime = 0;
  try {
    await ensureMasterGain();
    await winAudio.play();
  } catch (err) {
    // ignore autoplay failures
  }
};
