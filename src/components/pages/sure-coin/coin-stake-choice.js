import React, { useEffect, useState, useRef } from "react";
import { useContext } from "react";
import { Context } from "../../../context/store";
import { FaCheckCircle, FaMinus } from "react-icons/fa";
import { CgAdd, CgRemove } from "react-icons/cg";
import { Switch } from "@mui/material";
import { getFromLocalStorage, setLocalStorage } from "../../utils/local-storage";

const CoinStakeChoice = (props) => {
    const {coinnumber, isspinning, nxtSession, prevSession, isOnline} = props;
    const [amount, setAmount] = useState(5);
    const [state, dispatch] = useContext(Context);
    const [inputErrors, setInputErrors] = useState({});
    const [defaultAmountChange, ] = useState(10);
    const [minimumBetAmount, setMinimumAmount] = useState(5);
    const [pickedBtn, setPickedBtn] = useState(null);
    const [autoBet, setAutoBet] =  useState(false);
    const [autoBetsLeft, setAutoBetsLeft] = useState(1);
    const [userPlaceBetOn, setUserPlaceBetOn] = useState(false);
    const [autoPick, setAutoPick] = useState(false)


    const setcanplayTheitems = () => {
        let itemtoplay = 'canplayitems-' + coinnumber;
        if (!state?.[itemtoplay]) {
            dispatch({type: "SET", key:itemtoplay, payload:true});
        }
    }

    const amountChanged = (e) => {
        // set Controlls here eg it should be less than  equal to balance
        // else show errors
        let value = parseInt(e.target.value);
        setAmount(value);
    }

    const unfocus = (e) => {
        if (amount < 5) {
            setAmount(5)
        }
    }

    useEffect(() => {
        const getDefaultUserAmount = getFromLocalStorage("userDefaultCoinAmount");
        if (getDefaultUserAmount) {
            setAmount(getDefaultUserAmount);
        } else {
            setAmount(5)
        }
    }, []);

    const changeAmount = (changeType) => {

        if (changeType === "increase") {
            let newAmount = defaultAmountChange + amount
            setAmount(newAmount);
        } else if (changeType === "decrease") {
            let newAmount = amount - defaultAmountChange
            if (newAmount > minimumBetAmount) {
                setAmount(newAmount);
            } else {
                setAmount(minimumBetAmount)
            }
        }
    }

    useEffect(() => {if( autoBetsLeft <= 0 ) { setAutoBetsLeft(0); setAutoBet(false) }}, [autoBetsLeft])
    const coinsideAutopick = () => {
        const choices = ["heads", "tails"]
        const i = Math.floor(Math.random() * 2);
        setPickedBtn(choices[i]);
    }
    useEffect(() => {
        if (isspinning == false) {
            //Next, we check if it's on auto and etoc picks are ok
            let timeOutId;
            // if(userPlaceBetOn) {
                // setUserPlaceBetOn(false);
                if (autoBet) {
                    // check for user and login
                    if(!state?.user) {
                        if(!state?.showloginmodal) {
                            dispatch({type:"SET", key:"showloginmodal", payload:true})
                        }
                        return;
                    }
                    if(autoBetsLeft > 0){
                        setUserPlaceBetOn(false);
                        timeOutId = setTimeout(() => {
                            if (!pickedBtn){coinsideAutopick()};
                            setUserPlaceBetOn(true);
                            setAutoBetsLeft((prev) => prev - 1)
                        }, 1000);
                    }
                } else {
                    // setUserPlaceBetOn(false);

                }
            
        } else {
            if(!autoBet) {
                setAutoPick(false);
            }
            setPickedBtn(null)
            setUserPlaceBetOn(false);

        }
        
    }, [isspinning])

    const pickClick = (pick) => {
        if (pick === "tails") {
            setPickedBtn("tails");
        } else if (pick === "heads") {
            setPickedBtn("heads");
        }

    }

    useEffect(() => {
        if (amount) {
            setLocalStorage("userDefaultCoinAmount", amount, 1000 * 60 * 60 * 2)
            dispatch({type:"SET",
                key: "coinselections",
                payload: state?.coinselections ? {...state?.coinselections, [coinnumber]:{pick: pickedBtn, amount: amount, userbeton:userPlaceBetOn}} : {[coinnumber]: {pick: pickedBtn, amount:amount, userbeton:userPlaceBetOn}}})
        }
    }, [amount, pickedBtn, userPlaceBetOn])

    const autoBetToggle = () => {
        setAutoBet(!autoBet);
    }
    const autoPickToggle = () => {
        if(!autoPick) {
            coinsideAutopick();
        }
        setAutoPick(!autoPick);
    }

    const userChangeAutopicks = (ev) => {
        setAutoBetsLeft(parseInt(ev.target.value))
    }

    const pressBetButton = () => {
        // other validations can have an on or no action at all
        // all validations notwithstanding
        if(!state?.user?.token) {
            dispatch({type:"SET", key:"showloginmodal", payload: true})
        } else {
            if (pickedBtn) {
                setUserPlaceBetOn(true)
            } else {
                setInputErrors({...inputErrors, userPick: "unpicked button"})
            }
        }
    }

    useEffect(() => {if (state?.promptdepositrequest?.show) {setAutoBet(false)}}, [state?.promptdepositrequest])
    
    return (
        <>
            <div className="user-input-section" onClick={() => setcanplayTheitems()}>                
                <div className="user-input-main flex">
                    <div className="input-collector flex-col w-1/2 m-1">
                        <div className="flex my-1">
                            <label className="my-2 text-white opacity-80 w-1/2 !md:w-1/4 flex">Amount</label>
                            <div className="sure-coin-amount-input-section flex w-1/2">
                                <CgRemove
                                    onClick={() => changeAmount("decrease") }
                                    className="mt-1 text-3xl opacity-60 hover:opacity-100 cursor-pointer" />
                                <input
                                    onChange={(e) => amountChanged(e)} 
                                    type="number"
                                    value={amount}
                                    min={minimumBetAmount}
                                    onBlur={(e) => unfocus(e)}
                                    className="border-[transparent] w-[80%] user-amount-input px-2 bg-transparent text-white"/>

                                <CgAdd className="mt-1 text-3xl opacity-60 hover:opacity-100 cursor-pointer" onClick={() => changeAmount("increase") }/>
                            </div>
                        </div>
                        <div className="win-info flex">
                            <label className="my-2 text-white opacity-80 w-1/2 md:w-1/4 ">Odds</label>
                            <div className="text-right font-[700] w-1/2 text-align-right"><small>x</small> 2</div>
                        </div>
                        <div className="win-info flex my-2">
                            <label className=" text-white opacity-80 w-1/2 !md:w-1/4 flex win-amount">Payout</label>
                            <div className="text-right font-[700] w-1/2 text-align-right float-end">KES. {amount *2 }.00</div>
                        </div>
                    </div>
                    <div className="flex-col w-1/2 autoBet-settings">
                        <div className="px-3 text-center">
                            <div className="flex">
                                <div className="flex-col w-1/2">
                                    <div className="">
                                        Auto Pick
                                    </div>
                                    <Switch
                                            checked={autoPick}
                                            onChange={() => autoPickToggle()}
                                        />
                                </div>
                                <div className="flex-col w-1/2">
                                    <div>Auto Bet</div>
                                        <Switch
                                            checked={autoBet}
                                            onChange={() => autoBetToggle()}
                                        />
                                        {autoBet && 
                                            <div className="autopicks-left sure-coin-amount-input-section mx-auto flex !py-0 !px-1 !bg-[rgba(0,0,0,0.2)]">
                                                <CgRemove
                                                    onClick={() => setAutoBetsLeft(autoBetsLeft - 1) }
                                                    className="mt-1 text-4xl opacity-60 hover:opacity-100 cursor-pointer" />
                                                <input
                                                    name=""
                                                    type="number"
                                                    className="bg-[transparent] !w-[40px] px-2"
                                                    value={autoBetsLeft}
                                                    onChange={(ev) => userChangeAutopicks(ev)}
                                                    max={50}
                                                    min={1}

                                                />
                                                <CgAdd
                                                    className="mt-1 text-4xl opacity-60 hover:opacity-100 cursor-pointer"
                                                    onClick={() => setAutoBetsLeft(autoBetsLeft + 1) }/>
                                            </div>
                                        }

                                        {(autoBet && !nxtSession?.coinselections?.[coinnumber]?.pick) && <div className="autopick-hint">select auto pick</div>}

                                </div>
                                
                            </div>
                        </div>
                    </div>
                    
                </div>
                <div className="user-selection my-2 border-t border-gray-900 pt-3 pb-2">
                    <div className={`input-place-bet-btn text-center w-full font-bol row`}>
                        <div className="col-md-6">
                            <div className={`row ${inputErrors?.userPick && "pick-errors"}`}>
                                <div className="col-6 ">
                                    <button
                                        className={`relative mb-2 pickBtn !w-full head uppercase ${pickedBtn === "heads" ? "selected-btn selected-head" : ""}`}
                                        onClick={() => pickClick("heads")}
                                        >
                                            Heads {nxtSession?.coinselections?.[coinnumber]?.pick == "heads" && <FaCheckCircle className="user-picked-btn"/>}
                                    </button>
                                </div>
                                <div className="col-6 !pr-0">
                                    <button
                                        className={`relative pickBtn !w-full tail uppercase ${pickedBtn === "tails" ? "selected-btn selected-tail" : ""}`} 
                                        onClick={() => pickClick("tails")}
                                        >
                                        Tails {nxtSession?.coinselections?.[coinnumber]?.pick == "tails" && <FaCheckCircle className="user-picked-btn"/>}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 !pr-0">
                            <button disabled={!nxtSession?.coinselections?.[coinnumber]?.pick || nxtSession?.coinselections?.[coinnumber]?.userbeton} className={`${!nxtSession?.coinselections?.[coinnumber]?.pick && "no-picked-disabled"} w-full md:w-80 btn btn-place-surecoin-bet md:mb-0 mb-2 ${nxtSession?.coinselections?.[coinnumber]?.userbeton && "betplaced"}`} onClick={() => pressBetButton()}>{nxtSession?.coinselections?.[coinnumber]?.userbeton ? "Confirmed" : !nxtSession?.coinselections?.[coinnumber]?.pick ? "Pick Heads or Tails" : "Confirm Bet"}</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default React.memo(CoinStakeChoice);
