import React, {
    useContext,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import HeadsCoin from "../../../assets/surecoin/heads.png";
import TailsCoin from "../../../assets/surecoin/tails.png";
import WonGif from "../../../assets/img/casino/notes-falling.gif";
import { Context } from "../../../context/store";
import { useSureCoinRound } from "../../../context/surecoin-round";
import {
    isSurecoinAudioUnlocked,
    playWinSound,
    setSpinSoundActive,
    unlockSurecoinAudio,
} from "../../utils/surecoin-sound";

const normalizeSide = (value) => {
    const side = String(value || "").trim().toLowerCase();
    return side === "heads" || side === "tails" ? side : null;
};

/** Must match `.sc-coin-mesh.is-spinning` / `coinYawSpin` period in surecoin-shell.css */
const YAW_SPIN_PERIOD_MS = 8;
/** Short decelerating land — not a second multi-turn spin from rest */
const SETTLE_DURATION_MS = 420;
const SETTLE_SAFETY_MS = SETTLE_DURATION_MS + 100;

/** Perimeter segments approximating the metallic cylinder between faces. */
const COIN_RIM_SEGMENTS = 24;
const COIN_RIM_INDEXES = Array.from({ length: COIN_RIM_SEGMENTS }, (_, i) => i);

/** Current yaw (deg) from the live coinYawSpin animation, if present. */
const readCoinYawDeg = (el) => {
    if (!el?.getAnimations) return 0;
    try {
        const anims = el.getAnimations();
        for (let i = 0; i < anims.length; i += 1) {
            const anim = anims[i];
            const name = anim.animationName || "";
            if (!name.includes("coinYawSpin") && !name.includes("coinFlipSpin")) {
                continue;
            }
            const t = anim.currentTime;
            if (typeof t !== "number" || !Number.isFinite(t)) continue;
            const timed = anim.effect?.getTiming?.()?.duration;
            const period =
                typeof timed === "number" && timed > 0 ? timed : YAW_SPIN_PERIOD_MS;
            const into = ((t % period) + period) % period;
            return (into / period) * 360;
        }
    } catch {
        /* ignore */
    }
    return 0;
};

/**
 * Forward-only landing angle: even half-turns → heads, odd → tails.
 * Adds at least ~300° of coast so the handoff decelerates instead of snapping.
 */
const settleTargetYaw = (fromDeg, side) => {
    const from = Number.isFinite(fromDeg) ? fromDeg : 0;
    const wantOdd = side === "tails";
    let halfTurns = Math.ceil(from / 180);
    if ((halfTurns % 2 === 1) !== wantOdd) {
        halfTurns += 1;
    }
    let target = halfTurns * 180;
    if (target - from < 300) {
        target += 360;
    }
    return target;
};

const RotatingCoin = (props) => {
    const {
        isspinning,
        coinnumber,
        usermuted,
        userSoundSet,
        coinSettled,
        onOutcomeChange,
    } = props;
    const [state] = useContext(Context);
    const { state: roundState } = useSureCoinRound();
    const [spinOutcome, setSpinOutcome] = useState(null);
    const [coinOnDisplay, setCoinOnDisplay] = useState("heads");
    const [isSettling, setIsSettling] = useState(false);
    /** Keep yaw CSS spin alive after FLIPPING ends until settle can start (avoids dead frame). */
    const [holdSpin, setHoldSpin] = useState(false);
    const [won, setWon] = useState(null);
    const onOutcomeChangeRef = useRef(onOutcomeChange);
    const wasSpinningRef = useRef(false);
    const previousWinStateRef = useRef(null);
    const meshRef = useRef(null);
    const settleFromYawRef = useRef(0);
    const settleAnimRef = useRef(null);

    const visuallySpinning = (isspinning || holdSpin) && !isSettling;

    useEffect(() => {
        onOutcomeChangeRef.current = onOutcomeChange;
    }, [onOutcomeChange]);

    const publishSettledSide = (rawSide) => {
        const side = normalizeSide(rawSide);
        if (!side) return null;
        setSpinOutcome(side);
        setCoinOnDisplay(side);
        if (typeof onOutcomeChangeRef.current === "function") {
            onOutcomeChangeRef.current(side.toUpperCase());
        }
        return side;
    };

    const clearOutcome = () => {
        setSpinOutcome(null);
        setCoinOnDisplay(null);
        if (typeof onOutcomeChangeRef.current === "function") {
            onOutcomeChangeRef.current(null);
        }
    };

    useEffect(() => {
        if (isspinning) {
            wasSpinningRef.current = true;
            setHoldSpin(true);
            clearOutcome();
            setWon(null);
            setIsSettling(false);
            if (settleAnimRef.current) {
                settleAnimRef.current.cancel();
                settleAnimRef.current = null;
            }
            return;
        }

        if (roundState.lastResolved?.win === true) {
            setWon("won");
        } else if (roundState.lastResolved?.win === false) {
            setWon("lost");
        } else {
            setWon(null);
        }

        let settledSide = null;
        if (roundState.winningSide) {
            settledSide = publishSettledSide(roundState.winningSide);
        }

        if (wasSpinningRef.current && settledSide) {
            // Capture yaw while holdSpin still keeps coinYawSpin running this paint.
            settleFromYawRef.current = readCoinYawDeg(meshRef.current);
            setIsSettling(true);
            setHoldSpin(false);
            wasSpinningRef.current = false;
            return;
        }

        // Outcome late: keep spinning until winningSide arrives; abort on new wait.
        if (wasSpinningRef.current && !settledSide) {
            if (roundState.phase === "WAITING" || roundState.phase == null) {
                setHoldSpin(false);
                wasSpinningRef.current = false;
            }
        }
    }, [isspinning, roundState.winningSide, roundState.lastResolved, roundState.phase]);

    // Seamless settle: continue from captured yaw (WAAPI). CSS settle-* is fallback only.
    useLayoutEffect(() => {
        if (!isSettling || !coinOnDisplay) return undefined;
        const el = meshRef.current;
        if (!el || typeof el.animate !== "function") return undefined;

        const from = settleFromYawRef.current;
        const to = settleTargetYaw(from, coinOnDisplay);

        // Suppress CSS settle keyframes so they don't restart from rotateY(0).
        // Important beats stylesheet settle; spin !important is already off (no is-spinning).
        el.style.setProperty("animation", "none", "important");

        settleAnimRef.current?.cancel();
        const anim = el.animate(
            [
                { transform: `translateY(-6px) rotateY(${from}deg)` },
                { transform: `translateY(0) rotateY(${to}deg)` },
            ],
            {
                duration: SETTLE_DURATION_MS,
                easing: "cubic-bezier(0.05, 0.8, 0.12, 1)",
                fill: "forwards",
            }
        );
        settleAnimRef.current = anim;

        const finish = () => {
            if (settleAnimRef.current === anim) {
                settleAnimRef.current = null;
            }
            setIsSettling(false);
        };
        anim.addEventListener("finish", finish);

        return () => {
            anim.removeEventListener("finish", finish);
            anim.cancel();
            if (settleAnimRef.current === anim) {
                settleAnimRef.current = null;
            }
            el.style.removeProperty("animation");
        };
    }, [isSettling, coinOnDisplay]);

    useEffect(() => {
        const currentWinState = roundState.lastResolved?.win ?? null;
        const wonNow = currentWinState === true;
        const hadWonBefore = previousWinStateRef.current === true;

        if (wonNow && !hadWonBefore && !usermuted && (userSoundSet || isSurecoinAudioUnlocked())) {
            playWinSound(usermuted);
        }

        previousWinStateRef.current = currentWinState;
    }, [roundState.lastResolved?.win, usermuted, userSoundSet]);

    useEffect(() => {
        if (won === "won" || won === "lost") {
            const timer = setTimeout(() => setWon(null), 3000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [won]);

    useEffect(() => {
        if (!isSettling) return undefined;
        const safety = setTimeout(() => setIsSettling(false), SETTLE_SAFETY_MS);
        return () => clearTimeout(safety);
    }, [isSettling]);

    const handleCoinAnimationEnd = (event) => {
        // CSS settle fallback only (WAAPI path finishes via animation finish event).
        if (settleAnimRef.current) return;
        const name = event?.animationName || "";
        if (!name.includes("coinSettle")) return;
        setIsSettling(false);
    };

    useEffect(() => {
        if (visuallySpinning || isSettling) return;
        const pick = state?.coinselections?.[coinnumber]?.pick;
        if (pick) {
            setCoinOnDisplay(pick);
        }
    }, [state?.coinselections?.[coinnumber]?.pick, visuallySpinning, isSettling, coinnumber]);

    useEffect(() => {
        const unlocked = userSoundSet || isSurecoinAudioUnlocked();

        // Soft-mute while spinning: keep spinWanted=true (via muted=true) so a
        // mid-flip unmute/unlock can recreate the BufferSource. Hard-off only
        // when idle — otherwise unlockSurecoinAudio sees spinWanted=false and
        // cannot recover audible playback after a suspended context.
        if (usermuted) {
            if (visuallySpinning) {
                setSpinSoundActive(true, true, { phase: "spin" });
            } else if (isSettling) {
                setSpinSoundActive(true, true, { phase: "settle" });
            } else {
                setSpinSoundActive(false, true);
            }
            return undefined;
        }

        if (visuallySpinning) {
            // If not unlocked yet, keep spinWanted with muted=true so a later
            // gesture/unlock can start the loop mid-flip.
            setSpinSoundActive(true, !unlocked, { phase: "spin" });
            return undefined;
        }
        if (isSettling) {
            setSpinSoundActive(true, !unlocked, { phase: "settle" });
            return undefined;
        }
        // Hard stop only when truly idle (not the brief gap before isSettling).
        // Short defer so the settle path from the same spin-end tick wins.
        const stopTimer = setTimeout(() => {
            setSpinSoundActive(false, false);
        }, 32);
        return () => clearTimeout(stopTimer);
    }, [visuallySpinning, isSettling, usermuted, userSoundSet]);

    // If audio unlocks mid-flip (unmute / confirm / pick), force-restart the loop.
    useEffect(() => {
        const onUnlocked = () => {
            if (!visuallySpinning) return;
            // usermuted may still be true in this closure for one tick after
            // enable-sound; unlockSurecoinAudio already restarts when spinWanted.
            // Force again once unmuted / when the gesture event fires.
            if (usermuted) return;
            setSpinSoundActive(true, false, {
                phase: "spin",
                forceRestart: true,
            });
        };
        window.addEventListener("surecoin:sound-unlocked", onUnlocked);
        return () =>
            window.removeEventListener("surecoin:sound-unlocked", onUnlocked);
    }, [visuallySpinning, usermuted]);

    const handleCoinAreaPointer = () => {
        // User gesture on the coin primes Web Audio so the next/current spin can be heard.
        unlockSurecoinAudio();
    };

    const faceClass =
        !visuallySpinning && !isSettling && coinOnDisplay
            ? `face-${coinOnDisplay}`
            : "";
    // settle-* CSS is fallback when WAAPI is unavailable; WAAPI clears animation inline.
    const settleClass =
        isSettling && coinOnDisplay ? `is-settling settle-${coinOnDisplay}` : "";

    const payout =
        roundState.lastResolved?.payout ??
        roundState.myBet?.possibleWin ??
        state?.coinselections?.[coinnumber]?.amount * 2;

    return (
        <div
            className="relative sc-coin-stage"
            onPointerDown={handleCoinAreaPointer}
        >
            <div
                className={`sc-coin-ground-shadow${visuallySpinning ? " is-spinning" : ""}${isSettling ? " is-settling" : ""}`}
                aria-hidden="true"
            />
            <div className="notify-win-container">
                <div className={`flex capitalize notify-win ${won === "won" ? "won" : won === "lost" ? "lost" : ""}`}>
                    <span className="flex-col">
                        Outcome
                        <br />
                        <span className="font-bold uppercase">{spinOutcome}</span>
                    </span>
                    <span className="flex-col ml-2 won-amount">
                        {won === "won" && (
                            <>
                                WON
                                <br />
                            </>
                        )}
                        <span className="font-bold won-expanding">
                            {won === "won" ? (
                                <span>
                                    KES. <span>{Number(payout || 0).toFixed(2)}</span>
                                </span>
                            ) : (
                                <span className="mt-2 block">X</span>
                            )}
                        </span>
                    </span>
                </div>
            </div>
            {/*
              Pivot holds static view only (no animated rotateX).
              Mesh spins purely with rotateY about the vertical axis.
            */}
            <div className="sc-coin-yaw-pivot">
                <div
                    ref={meshRef}
                    className={`rotating-img sc-coin-mesh ${coinSettled ? "coin-settled" : ""} ${visuallySpinning ? "is-spinning" : ""} ${settleClass} ${faceClass}`}
                    onAnimationEnd={handleCoinAnimationEnd}
                >
                    <img
                        src={HeadsCoin}
                        alt="Heads"
                        className="coin-image coin-face coin-face--heads"
                        draggable={false}
                    />
                    <div className="sc-coin-rim" aria-hidden="true">
                        {COIN_RIM_INDEXES.map((i) => (
                            <span
                                key={i}
                                className="sc-coin-rim-seg"
                                style={{ "--rim-i": i }}
                            >
                                <span className="sc-coin-rim-face" />
                            </span>
                        ))}
                    </div>
                    <img
                        src={TailsCoin}
                        alt="Tails"
                        className="coin-image coin-face coin-face--tails"
                        draggable={false}
                    />
                </div>
            </div>

            {won === "won" && (
                <div className="won-gif-container">
                    <img src={WonGif} alt="" className="won-gif" />
                </div>
            )}
        </div>
    );
};

export default React.memo(RotatingCoin);
