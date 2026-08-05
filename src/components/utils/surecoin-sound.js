import SoundSpin from "../../assets/audio/surecoin/coin.mp3";
import SoundSpill from "../../assets/audio/surecoin/coin-spill.mp3";
import WinSound from "../../assets/audio/surecoin/win-mixkit.wav";
const STORAGE_KEY = "surecoin_audio_unlocked";
const SPIN_VOLUME = 1;
const GAIN_BOOST = 2.8;

let unlocked = false;
let spinAudio = null;
let winAudio = null;
let audioCtx = null;
let gainNode = null;
let spinMediaSource = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
};

const ensureGainNode = async () => {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  if (!gainNode) {
    gainNode = ctx.createGain();
    gainNode.gain.value = GAIN_BOOST;
    gainNode.connect(ctx.destination);
  }
  return gainNode;
};

const wireSpinElement = async () => {
  const audio = getSpinAudio();
  if (spinMediaSource) {
    return audio;
  }
  const gain = await ensureGainNode();
  const ctx = getAudioContext();
  spinMediaSource = ctx.createMediaElementSource(audio);
  spinMediaSource.connect(gain);
  return audio;
};

const getSpinAudio = () => {
  if (!spinAudio) {
    spinAudio = new Audio(SoundSpin);
    spinAudio.loop = true;
    spinAudio.preload = "auto";
    spinAudio.volume = SPIN_VOLUME;
  }
  return spinAudio;
};

export const isSurecoinAudioUnlocked = () =>
  unlocked || sessionStorage.getItem(STORAGE_KEY) === "1";

/** Call from a click/tap handler — browsers block audio until user gesture. */
export const unlockSurecoinAudio = async () => {
  if (isSurecoinAudioUnlocked()) {
    unlocked = true;
    await ensureGainNode();
    await wireSpinElement();
    return true;
  }

  try {
    await ensureGainNode();
    const probe = new Audio(SoundSpill);
    probe.volume = 0.15;
    await probe.play();
    probe.pause();
    probe.currentTime = 0;
    await wireSpinElement();
    unlocked = true;
    sessionStorage.setItem(STORAGE_KEY, "1");
    window.dispatchEvent(new Event("surecoin:sound-unlocked"));
    return true;
  } catch (err) {
    return false;
  }
};

export const setSpinSoundActive = async (active, muted) => {
  const audioUnlocked = isSurecoinAudioUnlocked();
  if (muted || !audioUnlocked) {
    if (spinAudio) {
      spinAudio.pause();
    }
    return;
  }

  try {
    const audio = await wireSpinElement();
    if (active) {
      if (audio.paused) {
        audio.currentTime = 0;
        await audio.play();
      }
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
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
    await ensureGainNode();
    await winAudio.play();
  } catch (err) {
    // ignore autoplay failures
  }
};
