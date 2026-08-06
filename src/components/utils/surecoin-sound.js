import SoundSpinAlt from "../../assets/audio/surecoin/coinspin-2.mp3";
import SoundWin from "../../assets/audio/surecoin/coin-win.mp3";
import SoundSpinDefault from "../../assets/audio/surecoin/coin-spin.mp3";
import SoundWobble from "../../assets/audio/surecoin/coin-wobble.mp3";
import SoundMetalCoinSpin from "../../assets/audio/surecoin/metal-coin-spin.mp3";
// Extracted from Surebet casino coins.mp4 (AAC → mp3) for Web Audio decodeAudioData.
import SoundCoins from "../../assets/audio/surecoin/coins.mp3";

const STORAGE_KEY = "surecoin_audio_unlocked";
const SPIN_GAIN = 0.85;
const SETTLE_MS = 520;
const SPIN_RATE = 1.12;
const SETTLE_RATE_END = 0.28;

export const SURECOIN_SPIN_SOUND_OPTIONS = {
  "coin-wobble": {
    label: "Coin Wobble",
    src: SoundWobble,
    // Measured: ~2.87s; audible attack ~0.08s; trailing silence ~0.06s.
    startOffset: 0.08,
    loopStart: 0.08,
    loopEndPadding: 0.08,
  },
  "coin-spin": {
    label: "Coin Spin",
    src: SoundSpinDefault,
    // coin-spin.mp3 has ~620ms leading dead air before the audible attack.
    startOffset: 0.62,
    loopStart: 0.62,
    loopEndPadding: 0.38,
  },
  "coinspin-2": {
    label: "Coin Spin 2",
    src: SoundSpinAlt,
    // Measured (~6.46s): ~0.76s leading dead air; audible attack ~0.76s;
    // steady spin texture from ~1.12s; ~1.02s trailing silence after ~5.44s.
    startOffset: 0.76,
    loopStart: 1.12,
    loopEndPadding: 1.02,
  },
  // Source: BigSoundBank #2697 "Coin spinning on a table #1"
  // https://bigsoundbank.com/coin-spinning-on-a-table-1-s2697.html
  // License: CC0 1.0 (public domain) — commercial use OK, attribution optional.
  // €2 metal coin spinning on a varnished wooden table (Pierre SIBANARCO / Joseph Sardin).
  "metal-coin-spin": {
    label: "Metal Coin Spin",
    src: SoundMetalCoinSpin,
    // Measured (~12.00s): first audible ~0.04s; bright attack ~0.12–0.60s;
    // continuous metallic spin body ~0.80–3.10s; settle/wobble rises after ~5.2s.
    // Loop the steady spin ring only (exclude leading soft onset + late settle).
    startOffset: 0.08,
    loopStart: 0.8,
    loopEndPadding: 8.9,
  },
  coins: {
    label: "Coins (Surebet)",
    src: SoundCoins,
    // Kept for later: Clipchamp export of coins.mp4/coins.mp3 is fully silent
    // (all-zero AAC). Not used as ACTIVE until replaced with a real audio track.
    startOffset: 0,
    loopStart: 0,
    loopEndPadding: 0,
  },
};

// Active rolling/spinning loop (audible). `coins` retained in map but silent.
export const ACTIVE_SURECOIN_SPIN_SOUND_KEY = "metal-coin-spin";

let unlocked = false;
let winAudio = null;
let audioCtx = null;
let masterGain = null;
let ctxStateHooked = false;
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

const hookAudioContextState = (ctx) => {
  if (ctxStateHooked || !ctx) return;
  ctxStateHooked = true;
  ctx.addEventListener("statechange", () => {
    if (ctx.state !== "running") return;
    markUnlocked();
    // BufferSources started while suspended often stay silent after resume.
    if (spinWanted && (spinNeedsRestart || spinPhase !== "spin" || !spinSource)) {
      spinNeedsRestart = true;
      startSpinLoop(spinWantedKey).catch(() => {});
    }
  });
};

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    hookAudioContextState(audioCtx);
  }
  return audioCtx;
};

const markUnlocked = ({ forceEvent = false } = {}) => {
  const wasUnlocked = unlocked || sessionStorage.getItem(STORAGE_KEY) === "1";
  unlocked = true;
  sessionStorage.setItem(STORAGE_KEY, "1");
  // forceEvent: session flag can survive reload while AudioContext is suspended
  // again — listeners still need a signal after a real gesture unlock.
  if (!wasUnlocked || forceEvent) {
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

/**
 * Clamp playback offset into the buffer. If the configured trim is past the
 * end of the asset (wrong file / short buffer), fall back to 0 so we never
 * call BufferSource.start with an out-of-range offset (silent / throws).
 */
const resolveStartOffset = (buffer, option) => {
  const duration = buffer?.duration || 0;
  if (!(duration > 0)) return 0;
  const configured = Number(option?.startOffset);
  const raw = Number.isFinite(configured) ? configured : 0;
  if (raw < 0) return 0;
  // Past / at end → unsafe; play from the beginning.
  if (raw >= duration) return 0;
  // Leave a tiny tail so start()+loop has samples to read.
  const maxOffset = Math.max(0, duration - 0.05);
  return Math.min(raw, maxOffset);
};

/**
 * Validate / clamp loop points. Invalid loopStart/loopEnd can mute looping
 * BufferSources in Chrome. Returns null to use the whole buffer.
 */
const resolveLoopPoints = (buffer, option, startOffset) => {
  const duration = buffer?.duration || 0;
  if (!(duration > 1.2)) return null;

  const configuredStart = Number(option?.loopStart);
  const padding = Number(option?.loopEndPadding);
  const loopEndPadding = Number.isFinite(padding) && padding >= 0 ? padding : 0.2;
  let loopStart = Number.isFinite(configuredStart) ? configuredStart : startOffset;
  loopStart = Math.max(0, startOffset, loopStart);

  let loopEnd = Math.min(
    duration,
    Math.max(loopStart + 0.25, duration - loopEndPadding)
  );

  // Degenerate / inverted region → let the browser loop the whole buffer.
  if (
    !(loopStart >= 0) ||
    !(loopEnd > loopStart) ||
    loopStart >= duration ||
    loopEnd > duration + 1e-6
  ) {
    return null;
  }

  // Keep a usable loop window.
  if (loopEnd - loopStart < 0.2) {
    return null;
  }

  return { loopStart, loopEnd };
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

  if (!buffer || !(buffer.duration > 0)) {
    return false;
  }

  const option = getSpinSoundOption(soundKey);
  const startOffset = resolveStartOffset(buffer, option);
  const loopPoints = resolveLoopPoints(buffer, option, startOffset);

  spinGain = ctx.createGain();
  spinGain.gain.value = SPIN_GAIN;
  spinGain.connect(masterGain);

  const attachAndStart = (offset, loop) => {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    if (loop) {
      source.loopStart = loop.loopStart;
      source.loopEnd = loop.loopEnd;
    }
    source.playbackRate.value = SPIN_RATE;
    source.connect(spinGain);
    source.start(0, offset);
    return source;
  };

  try {
    spinSource = attachAndStart(startOffset, loopPoints);
  } catch (err) {
    // Offset/loop mismatch — recreate and play from 0 with whole-buffer loop.
    // (A BufferSource can only be started once, so retry needs a new node.)
    try {
      spinSource = attachAndStart(0, null);
    } catch (err2) {
      stopSpinSource();
      return false;
    }
  }
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
  spinNeedsRestart = false;
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
    const ctx = getAudioContext();
    const wasSuspended = ctx.state === "suspended";
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
    // Re-notify when a gesture resumes a suspended context that still had the
    // session unlock flag (reload case). Skip when already running so coin
    // taps do not restart an audible loop every pointerdown.
    markUnlocked({ forceEvent: wasSuspended });

    // Recreate the spin graph after a gesture when the UI wants audio and the
    // current source is missing, settling, or was started while suspended.
    // Resuming a suspended BufferSource is often still silent in Chrome.
    if (spinWanted) {
      const needsRestart =
        wasSuspended ||
        spinNeedsRestart ||
        spinPhase !== "spin" ||
        !spinSource;
      if (needsRestart) {
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
