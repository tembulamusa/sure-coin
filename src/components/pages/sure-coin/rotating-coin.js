import React, { useContext, useEffect, useRef, useState } from "react";
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

/** Perimeter segments approximating the metallic cylinder between faces. */
const COIN_RIM_SEGMENTS = 24;
const COIN_RIM_INDEXES = Array.from({ length: COIN_RIM_SEGMENTS }, (_, i) => i);

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
    const [won, setWon] = useState(null);
    const onOutcomeChangeRef = useRef(onOutcomeChange);
    const wasSpinningRef = useRef(false);
    const previousWinStateRef = useRef(null);

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
            clearOutcome();
            setWon(null);
            setIsSettling(false);
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
            setIsSettling(true);
            wasSpinningRef.current = false;
        }
    }, [isspinning, roundState.winningSide, roundState.lastResolved]);

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
        const safety = setTimeout(() => setIsSettling(false), 620);
        return () => clearTimeout(safety);
    }, [isSettling]);

    const handleCoinAnimationEnd = (event) => {
        const name = event?.animationName || "";
        if (!name.includes("coinSettle")) return;
        setIsSettling(false);
    };

    useEffect(() => {
        if (isspinning || isSettling) return;
        const pick = state?.coinselections?.[coinnumber]?.pick;
        if (pick) {
            setCoinOnDisplay(pick);
        }
    }, [state?.coinselections?.[coinnumber]?.pick, isspinning, isSettling, coinnumber]);

    useEffect(() => {
        const unlocked = userSoundSet || isSurecoinAudioUnlocked();

        // Explicit mute: hard-off (do not keep spinWanted — coin taps call unlock).
        if (usermuted) {
            setSpinSoundActive(false, true);
            return undefined;
        }

        if (isspinning) {
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
    }, [isspinning, isSettling, usermuted, userSoundSet]);

    // If audio unlocks mid-flip (unmute / confirm / pick), force-restart the loop.
    useEffect(() => {
        const onUnlocked = () => {
            if (usermuted || !isspinning) return;
            setSpinSoundActive(true, false, {
                phase: "spin",
                forceRestart: true,
            });
        };
        window.addEventListener("surecoin:sound-unlocked", onUnlocked);
        return () =>
            window.removeEventListener("surecoin:sound-unlocked", onUnlocked);
    }, [isspinning, usermuted]);

    const handleCoinAreaPointer = () => {
        // User gesture on the coin primes Web Audio so the next/current spin can be heard.
        unlockSurecoinAudio();
    };

    const faceClass =
        !isspinning && !isSettling && coinOnDisplay
            ? `face-${coinOnDisplay}`
            : "";
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
                className={`sc-coin-ground-shadow${isspinning ? " is-spinning" : ""}${isSettling ? " is-settling" : ""}`}
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
                    className={`rotating-img sc-coin-mesh ${coinSettled ? "coin-settled" : ""} ${isspinning ? "is-spinning" : ""} ${settleClass} ${faceClass}`}
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
