import React, { useContext, useEffect, useRef, useState } from "react";
import HeadsCoin from "../../../assets/surecoin/heads.png";
import TailsCoin from "../../../assets/surecoin/tails.png";
import WonGif from "../../../assets/img/casino/notes-falling.gif";
import Sound2 from "../../../assets/audio/surecoin/coin.mp3";
import Sound1 from "../../../assets/audio/surecoin/coin-spill.mp3";
import WinSound from "../../../assets/audio/surecoin/win-mixkit.wav";
import { Context } from "../../../context/store";

const normalizeSide = (value) => {
    const side = String(value || "").trim().toLowerCase();
    return side === "heads" || side === "tails" ? side : null;
};

const RotatingCoin = (props) => {
    const {isspinning, coinnumber,
        usermuted, cvterfxn,
         prevSession,
         prepToStart,
         userSoundSet,
         coinSettled,
         onOutcomeChange,
        } = props;
    const [timeLeft, setTimeLeft] = useState(0);
    const [state, dispatch] = useContext(Context);
    const [rotatingSpeedLevel, setRotatingSpeedLevel] = useState("low");
    const [spinOutcome, setSpinOutcome] = useState(null);
    const [coinOnDisplay, setCoinOnDisplay] = useState("heads");
    const [isSettling, setIsSettling] = useState(false);
    const [won, setWon] = useState(null);
    const [bigPrizeVisible, setBigPrizeVisible] = useState(false);
    const showJackpot = false; // Set to false to disable, true to enable
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
            // Hide OUTCOME while the coin is rolling; show again only after settle
            clearOutcome();
            setWon(null);
            setIsSettling(false);
            return;
        }

        if (cvterfxn(prevSession?.rslt, process.env.REACT_APP_OTCMEKI)?.[process.env.REACT_APP_CRWOCM] == true) {
            notifyWon();
        } else if (cvterfxn(prevSession?.rslt, process.env.REACT_APP_OTCMEKI)?.[process.env.REACT_APP_CRWOCM] == false) {
            setWon("lost");
        } else if (cvterfxn(prevSession?.rslt, process.env.REACT_APP_OTCMEKI)?.[process.env.REACT_APP_CRWOCM] == null) {
            setWon(null);
        }

        const decryptedOutcome = cvterfxn(prevSession?.rslt, process.env.REACT_APP_OTCMEKI)?.[process.env.REACT_APP_CROTCME];
        let settledSide = null;
        if (decryptedOutcome) {
            settledSide = publishSettledSide(decryptedOutcome);
        } else if (!prevSession?.rslt) {
            const choices = ["heads", "tails"];
            settledSide = publishSettledSide(choices[Math.floor(Math.random() * 2)]);
        }

        if (wasSpinningRef.current && settledSide) {
            setIsSettling(true);
            wasSpinningRef.current = false;
        }
    }, [isspinning]);

    const notifyWon = () => {
        setWon("won")
        if (!usermuted && userSoundSet) {
            
            const audio = new Audio(WinSound);
            audio.play();

        }
        return
    }

    useEffect(() => {
        if(won == "won" || won == "lost"){
            setTimeout(() => {
                setWon(null);
            }, 3000);
        }
    },[won])

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
        if (timeLeft <= 0) {
            return;
        }

        if (timeLeft <= 3 ) {
            if(rotatingSpeedLevel != "finishing") {
                
                setRotatingSpeedLevel("finishing");

            }
        }
        
        // if 
        const timer = setInterval(() => {
            let remTime = timeLeft - 1
            setTimeLeft(remTime);
            }, 1000);
            

        return () => clearInterval(timer); // Cleanup on unmount
            
    }, [timeLeft])

    // Preview user pick on the coin only while betting is open (not mid-spin)
    useEffect(() => {
        if (isspinning || isSettling) return;
        const pick = state?.coinselections?.[coinnumber]?.pick;
        if (pick) {
            setCoinOnDisplay(pick);
        }
    }, [state?.coinselections?.[coinnumber]?.pick, isspinning, isSettling, coinnumber]);
    
    // paly the sound
    useEffect(() => {
        if (!usermuted && userSoundSet) {
            const audio = new Audio(Sound1);
            const audio2 = new Audio(Sound2);

            if(!isspinning) {
                audio.pause();
                audio2.pause(); 
            } else  {
                // let timetogo = timeLeft()
                // audio.loop = true;
                audio2.pause();
                audio.play();
                
            } 
        }
        
    }, [isspinning]);

    // Jackpot logic (display every 1 minute)
    // useEffect(() => {
    //     const jackpotInterval = setInterval(() => {
    //         if (!isspinning) {
    //             setBigPrizeVisible(true);

    //             // Automatically close the popup after 4 seconds
    //             setTimeout(() => {
    //                 setBigPrizeVisible(false);
    //             }, 4000);
    //         }
    //     }, 60000); // 1-minute interval

    //     return () => clearInterval(jackpotInterval); // Cleanup on unmount
    // }, [isspinning]);


    useEffect(() => {
        if (!showJackpot) return; 
        
        const interval = setInterval(() => {
            setBigPrizeVisible(true);
        }, 60000);
    
        return () => clearInterval(interval);
    }, []);

    const handleBigPrizeClose = () => {
        setBigPrizeVisible(false);
    };

    const faceClass =
        !isspinning && !isSettling && !prepToStart && coinOnDisplay
            ? `face-${coinOnDisplay}`
            : "";
    const settleClass =
        isSettling && coinOnDisplay
            ? `is-settling settle-${coinOnDisplay}`
            : "";

    return (
        <div className="relative sc-coin-stage">
            <div
                className={`sc-coin-ground-shadow${isspinning ? " is-spinning" : ""}${!isspinning && prepToStart && !isSettling ? " is-prep" : ""}${isSettling ? " is-settling" : ""}`}
                aria-hidden="true"
            />
            <div className="notify-win-container">
                {/* {won && <div className="won-text won-expanding-text">won {prevSession?.coinselections?.[coinnumber]?.amount * 2}</div>} */}
                <div className={`flex capitalize notify-win ${won == "won" ? "won" : won == "lost" ? "lost" : ""}`}>
                    <span className="flex-col">Outcome<br/><span className="font-bold uppercase">{spinOutcome}</span></span>
                    <span className="flex-col ml-2 won-amount">
                        {won == "won" && <>WON<br/></>}
                        <span className="font-bold won-expanding">{won == "won" ? <span>KES. <span className="">{prevSession?.coinselections?.[coinnumber]?.amount * 2}.00</span></span> : <span className="mt-2 block">X</span> }</span>
                    </span>
                </div>
            </div>
            <div
                className={`rotating-img sc-coin-mesh ${coinSettled ? "coin-settled" : ""} ${isspinning ? "is-spinning" : ""} ${!isspinning && prepToStart && !isSettling ? "prep-to-start" : ""} ${settleClass} ${faceClass} rotating-speed-level-${rotatingSpeedLevel}`}
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
            
            {won == "won" && (
                <div className="won-gif-container">
                    <img src={WonGif} alt="" className="won-gif" />
                    {/* <div className=""></div> */}
                </div>
            )}

            {/* Sure Coin Jackpot Popup */}
            {showJackpot && bigPrizeVisible && (
                <>
                    <div className="surecoin-jackpot-modal-backdrop"></div>
                    <div className="surecoin-jackpot-modal">
                        <h2>🎉 Congrats! 🎉</h2>
                        <p className="modal-message-desktop">
                            You've qualified for the next 🏆<h4>jackpot</h4> 
                        </p>
                        <p className="modal-message-desktop">
                            Win up to <b>20x</b>! 💰 🌟
                        </p>
                        <p className="modal-message-mobile">
                            Next play for 🏆<h4>jackpot</h4>20x! 💰 🌟
                        </p>
                    </div>
                </>
            )}


            
        </div>
    )
}

export default React.memo(RotatingCoin);
