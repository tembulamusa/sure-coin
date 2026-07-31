import React, { useCallback, useContext, useEffect, useState } from "react";
import { Context } from "../../../context/store";
import { getFromLocalStorage } from "../../utils/local-storage";
import makeRequest from "../../utils/fetch-request";
import CryptoJS from "crypto-js";
import SoundInteractPrompt from "./sound-interact-prompt";
import SurecoinHeader from "./surecoin-header";
import BettingSidebar from "./betting-sidebar";
import GameDisplay from "./game-display";
import CoinStakeChoice from "./coin-stake-choice";
import TrustFooter from "./trust-footer";

const SureCoinIndex = () => {
    const [state, dispatch] = useContext(Context);
    const [userCoinCount] = useState(1);
    const [userMuted, setUserMuted] = useState(false);
    const [coinsAlertMsg, setCoinsAlertMsg] = useState(null);
    const [timeToNextStart] = useState(4000);
    const [nextSession, setNextSession] = useState({});
    const [prevSession, setPrevSession] = useState({});
    const [runCoinSpin, setRunCoinSPin] = useState(false);
    const [startRound, setStartRound] = useState(789);
    const [roundStats, setRoundStats] = useState({});
    const [isOnline, setIsOnline] = useState(true);
    const [networkBackOnCount, setNetworkBackOnCount] = useState(0);
    const [isDocumentVisible, setIsDocumentVisible] = useState(!document.hidden);
    const [prepToStart, setPrepToStart] = useState(false);
    const [userSoundSet, setUserSoundSet] = useState(false);
    const [coinSettled, setCoinSettled] = useState(false);
    const [lastOutcome, setLastOutcome] = useState(null);
    const user = getFromLocalStorage("user");

    // Clear on spin start (null); set HEADS/TAILS only when the coin settles
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
        if (runCoinSpin) {
            placeBet(nextSession);
            dispatch({ type: "SET", key: "iscoinrotating", payload: true });
        } else {
            dispatch({ type: "DEL", key: "iscoinrotating" });
        }
    }, [runCoinSpin]);

    useEffect(() => {
        if (coinsAlertMsg) {
            setTimeout(() => {
                setCoinsAlertMsg(null);
            }, 3000);
        }
    }, [coinsAlertMsg]);

    useEffect(() => {
        let spintimeout = false;
        if (runCoinSpin) {
            spintimeout = setTimeout(() => {
                setRunCoinSPin(false);
            }, timeToNextStart);
            setStartRound(startRound + 1);
            setRoundStats({});
        }

        return () => {
            clearTimeout(spintimeout);
        };
    }, [runCoinSpin]);

    useEffect(() => {
        const storedUser = getFromLocalStorage("user");
        if (storedUser) {
            dispatch({ type: "SET", key: "user", payload: storedUser });
        }
    }, []);

    function elizabeth(encryptedData, encryptionKey) {
        try {
            const adjustedKey = encryptionKey.padEnd(16, "0").substring(0, 16);
            const key = CryptoJS.enc.Utf8.parse(adjustedKey);
            const encryptedBytes = CryptoJS.enc.Base64.parse(encryptedData);
            const decryptedBytes = CryptoJS.AES.decrypt(
                { ciphertext: encryptedBytes },
                key,
                {
                    mode: CryptoJS.mode.ECB,
                    padding: CryptoJS.pad.Pkcs7,
                }
            );
            const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8);
            return JSON.parse(decryptedData);
        } catch (error) {
            return null;
        }
    }

    useEffect(() => {
        dispatch({ type: "SET", key: "surecoinlaunched", payload: true });
        let stRound = Math.floor(Math.random() * (4000 - 260) + 260);
        setStartRound(stRound);
        setNextSession({ round: stRound });

        return () => {
            dispatch({ type: "DEL", key: "surecoinlaunched" });
        };
    }, []);

    useEffect(() => {
        setNextSession({ ...nextSession, coinselections: state?.coinselections });
    }, [state?.coinselections]);

    const placeBet = (roundSession) => {
        let nxtRound = (nextSession?.round ? nextSession?.round : startRound) + 1;
        let session = user?.profile_id + ":" + nextSession?.round;
        if (roundSession?.coinselections?.[1]?.userbeton && isDocumentVisible && user?.profile_id) {
            let endpoint = "place-bet";
            makeRequest({
                url: endpoint,
                method: "POST",
                responseType: "text",
                data: {
                    session_id: session,
                    profile_id: user?.profile_id,
                    coin_side: state?.coinselections?.[1]?.pick?.toUpperCase(),
                    bet_amount: state?.coinselections?.[1]?.amount,
                },
                api_version: "sureCoin",
            }).then(([status, response]) => {
                if (status == 200) {
                    let cpBt = elizabeth(response, process.env.REACT_APP_OTCMEKI);
                    if (cpBt?.[process.env.REACT_APP_RSPST] == 200) {
                        dispatch({
                            type: "SET",
                            key: "toggleuserbalance",
                            payload: state?.toggleuserbalance
                                ? !state?.toggleuserbalance
                                : true,
                        });
                        getCoinRoll(cpBt?.[process.env.REACT_APP_BID], session, nxtRound);
                    } else {
                        setCoinsAlertMsg({
                            status: 400,
                            message: cpBt?.[process.env.REACT_APP_MGS] || "An error Occurred",
                        });
                        if (cpBt?.message == "Insuffient Balance") {
                            dispatch({
                                type: "SET",
                                key: "promptdepositrequest",
                                payload: { show: true },
                            });
                        }
                        setPrevSession(nextSession);
                        setNextSession({ round: nxtRound });
                    }
                } else {
                    setCoinsAlertMsg({
                        status: 400,
                        message:
                            response?.error?.mesage || response?.result || "An Error occurred",
                    });
                    setPrevSession(nextSession);
                    setNextSession({ round: nxtRound });
                }
            });
        } else {
            // Unauthenticated / no stake: local round advance (no login gate)
            setPrevSession(nextSession);
            setNextSession({ round: nxtRound });
            return;
        }
    };

    const getCoinRoll = (btID, session, nxtRound) => {
        let endpoint = "coin-roll";
        makeRequest({
            url: endpoint,
            method: "POST",
            responseType: "text",
            data: { session_id: session, bet_id: btID, profile_id: user?.profile_id },
            api_version: "sureCoin",
        }).then(([status, response]) => {
            if (status == 200) {
                let lastSes = nextSession;
                setPrevSession({ ...lastSes, rslt: response });
                setNextSession({ round: nxtRound });
            } else {
                setNextSession({ round: nxtRound });
                setCoinsAlertMsg({ status: 400, mesage: "An error occurred" });
            }
        });
    };

    useEffect(() => {
        const updateStatus = () => {
            setIsOnline(navigator.onLine);
        };
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
        if (isOnline == true) {
            setTimeout(() => {
                setNetworkBackOnCount(0);
            }, 2000);
        } else {
            setNetworkBackOnCount(1);
        }
    }, [isOnline]);

    return (
        <div className="launched-sure-coin">
            <div className="surecoin-body">
                {userSoundSet == false && (
                    <SoundInteractPrompt
                        setUserSoundSet={setUserSoundSet}
                        setUserMuted={setUserMuted}
                    />
                )}

                <SurecoinHeader
                    userMuted={userMuted}
                    setUserMuted={setUserMuted}
                    coinsAlertMsg={coinsAlertMsg}
                    networkBackOnCount={networkBackOnCount}
                    isOnline={isOnline}
                />

                <div className="sc-layout">
                    <BettingSidebar
                        isSpinning={runCoinSpin}
                        roundStats={roundStats}
                        lastOutcome={lastOutcome}
                    />

                    <div className="sc-main-column">
                        <div className="casino-service-sure-coin">
                            <GameDisplay
                                userCoinCount={userCoinCount}
                                runCoinSpin={runCoinSpin}
                                userMuted={userMuted}
                                nextSession={nextSession}
                                prevSession={prevSession}
                                userSoundSet={userSoundSet}
                                isOnline={isOnline}
                                setPrepToStart={setPrepToStart}
                                prepToStart={prepToStart}
                                coinSettled={coinSettled}
                                isDocumentVisible={isDocumentVisible}
                                elizabeth={elizabeth}
                                setRunCoinSPin={setRunCoinSPin}
                                roundStats={roundStats}
                                setCoinSettled={setCoinSettled}
                                setRoundStats={setRoundStats}
                                startRound={startRound}
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
                                                isspinning={runCoinSpin}
                                                nxtSession={nextSession}
                                                prevSession={prevSession}
                                                isDocumentVisible={isDocumentVisible}
                                                isOnline={isOnline}
                                                setPrepToStart={setPrepToStart}
                                                prepToStart={prepToStart}
                                                cvterfxn={elizabeth}
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
