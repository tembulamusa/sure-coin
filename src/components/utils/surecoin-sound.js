import SoundSpin from "../../assets/audio/surecoin/moneda.mp3";
import SoundSpill from "../../assets/audio/surecoin/coin-spill.mp3";
import WinSound from "../../assets/audio/surecoin/win-mixkit.wav";

const STORAGE_KEY = "surecoin_audio_unlocked";
const SPIN_GAIN = 0.85;
const SETTLE_MS = 520;
const SPIN_RATE = 1.12;
const SETTLE_RATE_END = 0.28;

let unlocked = false;
let winAudio = null;
let audioCtx = null;
let masterGain = null;
let spinBuffer = null;
let spinBufferPromise = null;
let spinSource = null;
let spinGain = null;
let spinPhase = "off"; // "off" | "spin" | "settle"
let settleRaf = null;
let settleToken = 0;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
};

const ensureMasterGain = async () => {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  if (!masterGain) {
    masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);
  }
  return masterGain;
};

const loadSpinBuffer = async () => {
  if (spinBuffer) return spinBuffer;
  if (!spinBufferPromise) {
    spinBufferPromise = (async () => {
      const ctx = getAudioContext();
      const res = await fetch(SoundSpin);
      const raw = await res.arrayBuffer();
      spinBuffer = await ctx.decodeAudioData(raw.slice(0));
      return spinBuffer;
    })().catch((err) => {
      spinBufferPromise = null;
      throw err;
    });
  }
  return spinBufferPromise;
};

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
};

const startSpinLoop = async () => {
  const ctx = getAudioContext();
  await ensureMasterGain();
  const buffer = await loadSpinBuffer();

  stopSpinSource();

  spinGain = ctx.createGain();
  spinGain.gain.value = SPIN_GAIN;
  spinGain.connect(masterGain);

  spinSource = ctx.createBufferSource();
  spinSource.buffer = buffer;
  spinSource.loop = true;
  // Skip soft attack / favor the metallic mid section when possible
  if (buffer.duration > 1.2) {
    spinSource.loopStart = 0.15;
    spinSource.loopEnd = Math.max(0.9, buffer.duration - 0.2);
  }
  spinSource.playbackRate.value = SPIN_RATE;
  spinSource.connect(spinGain);
  spinSource.start(0);
  spinPhase = "spin";
};

const rampSettleAndStop = () => {
  if (!spinSource || !spinGain || spinPhase === "settle") {
    if (spinPhase !== "spin") return;
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

/** Call from a click/tap handler — browsers block audio until user gesture. */
export const unlockSurecoinAudio = async () => {
  if (isSurecoinAudioUnlocked()) {
    unlocked = true;
    await ensureMasterGain();
    try {
      await loadSpinBuffer();
    } catch (err) {
      // buffer can load later
    }
    return true;
  }

  try {
    await ensureMasterGain();
    const probe = new Audio(SoundSpill);
    probe.volume = 0.15;
    await probe.play();
    probe.pause();
    probe.currentTime = 0;
    try {
      await loadSpinBuffer();
    } catch (err) {
      // defer decode
    }
    unlocked = true;
    sessionStorage.setItem(STORAGE_KEY, "1");
    window.dispatchEvent(new Event("surecoin:sound-unlocked"));
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * @param {boolean} active
 * @param {boolean} muted
 * @param {{ phase?: "spin" | "settle" }} [opts]
 */
export const setSpinSoundActive = async (active, muted, opts = {}) => {
  const audioUnlocked = isSurecoinAudioUnlocked();
  if (muted || !audioUnlocked || !active) {
    settleToken += 1;
    stopSpinSource();
    return;
  }

  const phase = opts.phase === "settle" ? "settle" : "spin";

  try {
    await ensureMasterGain();
    if (phase === "spin") {
      if (spinPhase === "spin" && spinSource) {
        // already looping — keep continuous
        return;
      }
      await startSpinLoop();
      return;
    }

    // settle: keep current loop and fade pitch/volume, or start briefly if needed
    if (spinPhase === "off" || !spinSource) {
      await startSpinLoop();
    }
    rampSettleAndStop();
  } catch (err) {
    // ignore autoplay / unlock failures
  }
};

export const playWinSound = async (muted) => {
  if (muted || !isSurecoinAudioUnlocked()) return;

  if (!winAudio) {
    winAudio = new Audio(WinSound);
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
