import React, { useCallback, useContext, useEffect, useState } from "react";
import { Context } from "../../../context/store";
import { useSureCoinRound } from "../../../context/surecoin-round";
import { getFromLocalStorage } from "../../utils/local-storage";
import SoundInteractPrompt from "./sound-interact-prompt";
import SurecoinHeader from "./surecoin-header";
import BettingSidebar from "./betting-sidebar";
import GameDisplay from "./game-display";
import CoinStakeChoice from "./coin-stake-choice";
import TrustFooter from "./trust-footer";
import {
    isSurecoinAudioUnlocked,
    unlockSurecoinAudio,
} from "../../utils/surecoin-sound";
import { dbgLog } from "../../utils/debug-log";

const SureCoinIndex = () => {
    const [state, dispatch] = useContext(Context);
    const { roundStats, isSpinning, state: roundState } = useSureCoinRound();
    const [userCoinCount] = useState(1);
    const [userMuted, setUserMuted] = useState(false);
    const [coinsAlertMsg, setCoinsAlertMsg] = useState(null);
    const [isOnline, setIsOnline] = useState(true);
    const [networkBackOnCount, setNetworkBackOnCount] = useState(0);
    const [isDocumentVisible, setIsDocumentVisible] = useState(!document.hidden);
    const [prepToStart, setPrepToStart] = useState(false);
  const isLocalSim = process.env.REACT_APP_LOCAL_SIM === "true";
  const [userSoundSet, setUserSoundSet] = useState(
    () => isLocalSim || isSurecoinAudioUnlocked()
  );
    const [coinSettled, setCoinSettled] = useState(true);
    const [lastOutcome, setLastOutcome] = useState(null);

    const handleOutcomeChange = useCallback((next) => {
        if (next == null || next === "") {
            setLastOutcome(null);
            return;
        }
        const side = String(next).trim().toUpperCase();
        if (side !== "HEADS" && side !== "TAILS") return;
        setLastOutcome(side);
    }, []);

    useEffect(() => {
        dispatch({ type: "SET", key: "iscoinrotating", payload: isSpinning });
    }, [dispatch, isSpinning]);

    useEffect(() => {
        if (roundState.winningSide) {
            handleOutcomeChange(roundState.winningSide);
        }
    }, [roundState.winningSide, handleOutcomeChange]);

    useEffect(() => {
        if (roundState.phase === "WAITING") {
            setCoinSettled(true);
            if (roundState.secondsRemaining <= 2) {
                setPrepToStart(true);
                setCoinSettled(false);
            } else {
                setPrepToStart(false);
            }
        } else if (roundState.phase === "FLIPPING") {
            setPrepToStart(false);
            setCoinSettled(false);
        }
    }, [roundState.phase, roundState.secondsRemaining]);

    useEffect(() => {
        if (state?.coinsAlertMsg) {
            setCoinsAlertMsg(state.coinsAlertMsg);
            dispatch({ type: "DEL", key: "coinsAlertMsg" });
        }
    }, [state?.coinsAlertMsg, dispatch]);

    useEffect(() => {
        if (coinsAlertMsg) {
            const timer = setTimeout(() => setCoinsAlertMsg(null), 3000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [coinsAlertMsg]);

    useEffect(() => {
        const storedUser = getFromLocalStorage("user");
        if (storedUser) {
            dispatch({ type: "SET", key: "user", payload: storedUser });
        }
    }, [dispatch]);

    useEffect(() => {
        dispatch({ type: "SET", key: "surecoinlaunched", payload: true });
        return () => {
            dispatch({ type: "DEL", key: "surecoinlaunched" });
        };
    }, [dispatch]);

    useEffect(() => {
        const updateStatus = () => setIsOnline(navigator.onLine);
        const handleVisibilityChange = () => {
            setIsDocumentVisible(!document.hidden);
        };

        window.addEventListener("online", updateStatus);
        window.addEventListener("offline", updateStatus);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("online", updateStatus);
            window.removeEventListener("offline", updateStatus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    useEffect(() => {
        if (isOnline === true) {
            const timer = setTimeout(() => setNetworkBackOnCount(0), 2000);
            return () => clearTimeout(timer);
        }
        setNetworkBackOnCount(1);
        return undefined;
    }, [isOnline]);

    const enableSoundFromGesture = useCallback(async () => {
        const ok = await unlockSurecoinAudio();
        if (ok) {
            setUserSoundSet(true);
            setUserMuted(false);
        }
    }, []);

    useEffect(() => {
        const onUnlocked = () => {
            setUserSoundSet(true);
            setUserMuted(false);
        };
        window.addEventListener("surecoin:sound-unlocked", onUnlocked);
        return () =>
            window.removeEventListener("surecoin:sound-unlocked", onUnlocked);
    }, []);

    useEffect(() => {
        // #region agent log
        dbgLog("index.js:sound-ui", "sound prompt state", { userSoundSet, userMuted, promptVisible: userSoundSet === false }, "H3");
        // #endregion
    }, [userSoundSet, userMuted]);

    return (
        <div className="launched-sure-coin">
            <div className="surecoin-body">
                {!isLocalSim && userSoundSet === false && (
                    <SoundInteractPrompt
                        setUserSoundSet={setUserSoundSet}
                        setUserMuted={setUserMuted}
                    />
                )}

                <SurecoinHeader
                    userMuted={userMuted}
                    setUserMuted={setUserMuted}
                    onEnableSound={enableSoundFromGesture}
                    setUserSoundSet={setUserSoundSet}
                    coinsAlertMsg={coinsAlertMsg}
                    networkBackOnCount={networkBackOnCount}
                    isOnline={isOnline}
                />

                <div className="sc-layout">
                    <BettingSidebar
                        isSpinning={isSpinning}
                        roundStats={roundStats}
                        lastOutcome={lastOutcome}
                    />

                    <div className="sc-main-column">
                        <div className="casino-service-sure-coin">
                            <GameDisplay
                                userCoinCount={userCoinCount}
                                isSpinning={isSpinning}
                                userMuted={userMuted}
                                userSoundSet={userSoundSet}
                                isOnline={isOnline}
                                setPrepToStart={setPrepToStart}
                                prepToStart={prepToStart}
                                coinSettled={coinSettled}
                                isDocumentVisible={isDocumentVisible}
                                roundStats={roundStats}
                                setCoinSettled={setCoinSettled}
                                lastOutcome={lastOutcome}
                                onOutcomeChange={handleOutcomeChange}
                            />

                            <div className="bet-control">
                                {Array(userCoinCount)
                                    .fill(1)
                                    .map((_, idx) => (
                                        <div className="coin-settings" key={`stake-${idx}`}>
                                            <CoinStakeChoice
                                                coinnumber={idx + 1}
                                                isspinning={isSpinning}
                                                isDocumentVisible={isDocumentVisible}
                                                isOnline={isOnline}
                                            />
                                        </div>
                                    ))}
                            </div>

                            <TrustFooter />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(SureCoinIndex);
