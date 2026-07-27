import React, { useContext, useEffect, useState } from "react";
import RotatingCoin from "./rotating-coin";
import CoinStakeChoice from "./coin-stake-choice";
import { Context } from "../../../context/store";
import { getFromLocalStorage } from "../../utils/local-storage";
import { BiSolidVolumeMute } from "react-icons/bi";
import { FaVolumeHigh } from "react-icons/fa6";
import SureCoinLogoImg from '../../../assets/img/svgicons/surecoin.svg';
import makeRequest from "../../utils/fetch-request";
import CryptoJS from "crypto-js";
import TakeBetsTimer from "./take-bets-timer";
import SoundInteractPrompt from "./sound-interact-prompt";


const SureCoinIndex = (props) => {
    const [state, dispatch] = useContext(Context);
    const [userCoinCount, ] = useState(1);
    const [userMuted, setUserMuted] = useState(false);
    const [coinsAlertMsg, setCoinsAlertMsg] = useState(null);
    const [timeToNextStart, ] = useState(4000);
    const [nextSession, setNextSession] = useState({});
    const [prevSession, setPrevSession] = useState({});
    const [runCoinSpin, setRunCoinSPin] = useState(false);
    const [startRound, setStartRound] = useState(789);
    const [roundStats, setRoundStats]  = useState({});
    const [isOnline, setIsOnline] = useState(true);
    const [networkBackOnCount, setNetworkBackOnCount] = useState(0);
    const [isDocumentVisible, setIsDocumentVisible] = useState(!document.hidden);
    const [prepToStart, setPrepToStart] = useState(false);
    const [userSoundSet, setUserSoundSet] = useState(false);
    const [coinSettled, setCoinSettled] = useState(false);
    const user = getFromLocalStorage("user");
    // On Run coin spin
    useEffect(() => {
        if (runCoinSpin) {
            placeBet(nextSession);
            dispatch({type:"SET", key:"iscoinrotating", payload:true})

        } else {
            dispatch({type:"DEL", key:"iscoinrotating"})
        }   
        
    }, [runCoinSpin]);

    

    useEffect(() => {
        if(coinsAlertMsg) {
            setTimeout(() => {
                setCoinsAlertMsg(null)
            }, 3000);
        }
}, [coinsAlertMsg])
    
    useEffect(() => {
        let spintimeout = false;
        if (runCoinSpin){
            spintimeout = setTimeout(() => {
                setRunCoinSPin(false)
            }, timeToNextStart);
            setStartRound(startRound + 1);
            setRoundStats({});
        }
        
        return () => {clearTimeout(spintimeout)};
    }, [runCoinSpin])

    useEffect(() => {
        const user = getFromLocalStorage("user");
        if (user) {
            dispatch({type:"SET", key:"user", payload:user})
        }
    }, [])

    function elizabeth(encryptedData, encryptionKey) {
        try {
        const adjustedKey = encryptionKey.padEnd(16, '0').substring(0, 16);
    
        const key = CryptoJS.enc.Utf8.parse(adjustedKey);
    
        const encryptedBytes = CryptoJS.enc.Base64.parse(encryptedData);
    
        const decryptedBytes = CryptoJS.AES.decrypt(
            { ciphertext: encryptedBytes },
            key,
            {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7
            }
        );
    
        const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(decryptedData);
        } catch (error) {
        return null;
        }
  }
  
  const computeStartRound = () => {
    // let roundNumber = ;
    
    
  }
  useEffect(() => {
    dispatch({type: "SET", key: "surecoinlaunched", payload: true});
    let stRound = Math.floor(Math.random() * (4000 - 260) + 260)
    setStartRound(stRound);
    setNextSession({round: stRound})
    
    return () => {
        dispatch({type:"DEL", key:"surecoinlaunched"})
    }
  }, [])

//   session manager
  useEffect(() => {
    setNextSession({...nextSession, coinselections: state?.coinselections});
  }, [state?.coinselections]);



    const placeBet = (roundSession) => {
        let nxtRound = (nextSession?.round ? nextSession?.round : startRound) + 1
        let session = user?.profile_id + ":" + nextSession?.round
        if (roundSession?.coinselections?.[1]?.userbeton && isDocumentVisible) {
            if(!user?.profile_id) {
                if (!state?.showloginmodal) {
                    dispatch({type:"SET", key:"showloginmodal", payload: true})
                }
                return
            }
            let endpoint = 'place-bet';
            makeRequest({url: endpoint, 
                method: 'POST',
                responseType: "text",
                data: {session_id: session, profile_id: user?.profile_id, coin_side: state?.coinselections?.[1]?.pick?.toUpperCase(), bet_amount: state?.coinselections?.[1]?.amount},
                api_version:"sureCoin"}).then(([status, response]) => {
                if(status == 200) {
                    let cpBt = elizabeth(response, process.env.REACT_APP_OTCMEKI);
                    if (cpBt?.[process.env.REACT_APP_RSPST] == 200) {
                        dispatch({type:"SET", key: "toggleuserbalance", payload:state?.toggleuserbalance ? !state?.toggleuserbalance : true})
                        getCoinRoll(cpBt?.[process.env.REACT_APP_BID], session, nxtRound);
                    } else {
                        setCoinsAlertMsg({status: 400, message: cpBt?.[process.env.REACT_APP_MGS] || "An error Occurred"});
                        if(cpBt?.message == "Insuffient Balance") {
                            dispatch({type:"SET", key:"promptdepositrequest", payload:{show:true}});
                        }
                        setPrevSession(nextSession);
                        setNextSession({round: nxtRound})
                    }
                } else {
                    setCoinsAlertMsg({status:400, message: response?.error?.mesage || response?.result || "An Error occurred"})
                    setPrevSession(nextSession);
                    setNextSession({round: nxtRound})
                }
            })
        } else {
            setPrevSession(nextSession);
            setNextSession({round: nxtRound})
            return
        }
   }
    const getCoinRoll = (btID, session, nxtRound) => {
        // get session id and use it
        let endpoint = 'coin-roll';
        makeRequest({url: endpoint,
                method: 'POST',
                responseType: "text",  
                data: {session_id: session, bet_id: btID, profile_id: user?.profile_id},
                api_version:'sureCoin'}).then(([status, response]) => {
            let cpBt = elizabeth(response, process.env.REACT_APP_OTCMEKI);

            if(status == 200) {
                
                let lastSes = nextSession;
                setPrevSession({...lastSes, rslt: response});
                setNextSession({round: nxtRound})
                
            } else {
                setNextSession({round: nxtRound})
                setCoinsAlertMsg({status: 400, mesage: "An error occurred"});
            }
        })
    }
    
    useEffect(() => {
        const updateStatus = () => {
          setIsOnline(navigator.onLine);
        };
        const handleVisibilityChange = () => {
            setIsDocumentVisible(!document.hidden);
          };

        window.addEventListener("online", updateStatus);
        window.addEventListener("offline", updateStatus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
          window.removeEventListener("online", updateStatus);
          window.removeEventListener("offline", updateStatus);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      }, []);

      useEffect(() => {
        if (isOnline == true){
            setTimeout(() => {
                setNetworkBackOnCount(0)
            }, 2000);
        } else {
            setNetworkBackOnCount(1)
        }
      }, [isOnline]);

    const StatsInfo = () => {

        return (
            <>
                <div>Round: {startRound}</div>
                <hr />
                <div className="scores">
                    <div>Bets: {roundStats?.bets}</div>
                    <div> Heads: {roundStats?.heads || "0"}% </div> <div> Tails: {roundStats?.tails || "0"}% </div>
                </div>

            </>
        )
    }



    return (
        <>

        <div className="launched-sure-coin">
            {/* <PageHeader /> */}
            <div className="surecoin-body">

                {/*  */}
                {userSoundSet == false && <SoundInteractPrompt setUserSoundSet={setUserSoundSet} setUserMuted={setUserMuted}/>}
                
                <div className="surecoin-main md:flex">
                    <div className={`sure-coin-betting-section md:flex-col  w-full md:w-6/12 mx-auto`}>
                        <div className="sure-coin-header row relative">
                            {coinsAlertMsg && 
                                <div className={`sure-alert height-hide ${coinsAlertMsg.status == 200 ? "success" : "error"}`}>{coinsAlertMsg.message}</div>
                            }

                            {/* online offline */}
                            {<div className={`network-changes ${(networkBackOnCount == 1 && isOnline) ? "just-back" : ""} ${(!isOnline || networkBackOnCount > 0) && "show"}`}>{!isOnline ? "You are offline" : "You are back online"}</div>}

                            <div className="col-sm-4 w-4/12 md:w-6/12 col-md-6 ">
                                <div className="flex"><img src={SureCoinLogoImg} className="surecoin-logo-img" /> SURECOIN </div>
                            </div>
                            <div className="col-sm-8 w-8/12 md:w-6/12 col-md-6">
                                <div className="float-end flex">
                                   <div className="inline-block text-2xl pr-2" >
                                        {/* <FaInfo /> */}
                                    </div>
                                    <div className="inline-block text-3xl" onClick={() => setUserMuted(userMuted ? false : true)}>
                                        {userMuted ? <BiSolidVolumeMute /> : <FaVolumeHigh />}</div>
                                    </div>
                            </div>
                        </div>
                        <div className="casino-service-sure-coin relative">
                        
                            <div className="coin-extra-info coin-quick-stats">
                                <StatsInfo />
                            </div>


                            <div className="rotating-images-wrapper coin-sections relative">
                            <div className="director-message">{!runCoinSpin ? "Choose Heads or Tails and Confirm" : "Wait for Next Round"}</div>
                                { Array(userCoinCount).fill(1).map((coin, idx) => (
                                    <div className="rotating-image-container">
                                        <RotatingCoin 
                                            coinnumber={idx + 1}
                                            isspinning={runCoinSpin}
                                            usermuted={userMuted}
                                            nxtSession = {nextSession}
                                            prevSession = {prevSession}
                                            userSoundSet={userSoundSet}
                                            isOnline = {isOnline}
                                            setPrepToStart={setPrepToStart}
                                            prepToStart = {prepToStart}
                                            coinSettled={coinSettled}
                                            isDocumentVisible = {isDocumentVisible}
                                            cvterfxn = {elizabeth}/>

                                    </div>
                                ))}
                            {(!runCoinSpin && isOnline && isDocumentVisible) ? 
                                <TakeBetsTimer
                                    setRunCoinSpin={setRunCoinSPin}
                                    roundStats={roundStats}
                                    setPrepToStart={setPrepToStart}
                                    prepToStart = {prepToStart}
                                    setCoinSettled={setCoinSettled}
                                    setRoundStats={setRoundStats} /> : 
                                <div className="bets-timer-empty-holder"></div>}
                            </div>
                            <div className="bet-control">
                                { Array(userCoinCount).fill(1).map((coin, idx) => (
                                    <div className="coin-settings">
                                        <CoinStakeChoice
                                            coinnumber={idx + 1}
                                            isspinning={runCoinSpin}
                                            nxtSession = {nextSession}
                                            prevSession = {prevSession}
                                            isDocumentVisible = {isDocumentVisible}
                                            isOnline = {isOnline}
                                            setPrepToStart={setPrepToStart}
                                            prepToStart = {prepToStart}
                                            cvterfxn = {elizabeth}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    {/* <div className={`comments-settings md:flex-col md:w-4/12 w-full`}>
                        tabs <br/>
                        changes to comments and settings alternatively
                    </div> */}
                </div>
                
                {/* <div className="additional-data">

                </div> */}
            </div>
        </div>
        
        </>
    )
}



export default React.memo(SureCoinIndex)
