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
} from "../../utils/surecoin-sound";

const normalizeSide = (value) => {
    const side = String(value || "").trim().toLowerCase();
    return side === "heads" || side === "tails" ? side : null;
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
    const [rotatingSpeedLevel, setRotatingSpeedLevel] = useState("low");
    const [spinOutcome, setSpinOutcome] = useState(null);
    const [coinOnDisplay, setCoinOnDisplay] = useState("heads");
    const [isSettling, setIsSettling] = useState(false);
    const [won, setWon] = useState(null);
    const onOutcomeChangeRef = useRef(onOutcomeChange);
    const wasSpinningRef = useRef(false);

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
            if (roundState.flipProgress >= 75) {
                setRotatingSpeedLevel("finishing");
            }
            return;
        }

        if (roundState.lastResolved?.win === true) {
            setWon("won");
            if (!usermuted && (userSoundSet || isSurecoinAudioUnlocked())) {
                playWinSound(usermuted);
            }
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
    }, [
        isspinning,
        roundState.winningSide,
        roundState.lastResolved,
        roundState.flipProgress,
        usermuted,
        userSoundSet,
    ]);

    useEffect(() => {
        if (won === "won" || won === "lost") {
            const timer = setTimeout(() => setWon(null), 3000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [won]);

    useEffect(() => {
        if (!isSettling) return undefined;
        const safety = setTimeout(() => setIsSettling(false), 580);
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
        const soundEnabled =
            !usermuted && (userSoundSet || isSurecoinAudioUnlocked());
        if (!soundEnabled) {
            setSpinSoundActive(false, true);
            return;
        }
        setSpinSoundActive(isspinning, usermuted);
    }, [isspinning, usermuted, userSoundSet, roundState.phase, isSettling, rotatingSpeedLevel, roundState.flipProgress]);

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
        <div className="relative sc-coin-stage">
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
            <div
                className={`rotating-img sc-coin-mesh ${coinSettled ? "coin-settled" : ""} ${isspinning ? "is-spinning" : ""} ${settleClass} ${faceClass} rotating-speed-level-${rotatingSpeedLevel}`}
                onAnimationEnd={handleCoinAnimationEnd}
            >
                <img
                    src={HeadsCoin}
                    alt="Heads"
                    className="coin-image coin-face coin-face--heads"
                    draggable={false}
                />
                <img
                    src={TailsCoin}
                    alt="Tails"
                    className="coin-image coin-face coin-face--tails"
                    draggable={false}
                />
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
