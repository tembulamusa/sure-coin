import React, { useEffect, useState, useContext } from "react";
import { Context } from "../../../context/store";
import { FaCheck, FaCheckCircle } from "react-icons/fa";
import { CgAdd, CgRemove } from "react-icons/cg";
import { GiTwoCoins } from "react-icons/gi";
import { MdOutlineGpsFixed } from "react-icons/md";
import { getFromLocalStorage, setLocalStorage } from "../../utils/local-storage";
import HeadsCoin from "../../../assets/surecoin/heads.png";
import TailsCoin from "../../../assets/surecoin/tails.png";

const DEFAULT_AUTO_ROUNDS = 10;
const MAX_AUTO_ROUNDS = 99;

const ScToggle = ({ checked, onChange, label }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`sc-toggle${checked ? " is-on" : ""}`}
        onClick={onChange}
    >
        <span className="sc-toggle-thumb" />
    </button>
);

const CoinStakeChoice = (props) => {
    const { coinnumber, isspinning, nxtSession } = props;
    const [amount, setAmount] = useState(5);
    const [state, dispatch] = useContext(Context);
    const [inputErrors, setInputErrors] = useState({});
    const [defaultAmountChange] = useState(10);
    const [minimumBetAmount] = useState(5);
    const [pickedBtn, setPickedBtn] = useState(null);
    const [autoBet, setAutoBet] = useState(false);
    const [autoBetsLeft, setAutoBetsLeft] = useState(DEFAULT_AUTO_ROUNDS);
    const [userPlaceBetOn, setUserPlaceBetOn] = useState(false);
    const [autoPick, setAutoPick] = useState(false);

    const setcanplayTheitems = () => {
        let itemtoplay = "canplayitems-" + coinnumber;
        if (!state?.[itemtoplay]) {
            dispatch({ type: "SET", key: itemtoplay, payload: true });
        }
    };

    const amountChanged = (e) => {
        let value = parseInt(e.target.value);
        setAmount(value);
    };

    const unfocus = () => {
        if (amount < 5) {
            setAmount(5);
        }
    };

    useEffect(() => {
        const getDefaultUserAmount = getFromLocalStorage("userDefaultCoinAmount");
        if (getDefaultUserAmount) {
            setAmount(getDefaultUserAmount);
        } else {
            setAmount(5);
        }
    }, []);

    const changeAmount = (changeType) => {
        if (changeType === "increase") {
            setAmount(defaultAmountChange + amount);
        } else if (changeType === "decrease") {
            let newAmount = amount - defaultAmountChange;
            if (newAmount > minimumBetAmount) {
                setAmount(newAmount);
            } else {
                setAmount(minimumBetAmount);
            }
        }
    };

    useEffect(() => {
        if (autoBetsLeft <= 0 && autoBet) {
            setAutoBetsLeft(0);
            setAutoBet(false);
        }
    }, [autoBetsLeft, autoBet]);

    const coinsideAutopick = () => {
        const choices = ["heads", "tails"];
        const i = Math.floor(Math.random() * 2);
        setPickedBtn(choices[i]);
    };

    useEffect(() => {
        if (isspinning == false) {
            let timeOutId;
            if (autoBet) {
                if (autoBetsLeft > 0) {
                    setUserPlaceBetOn(false);
                    timeOutId = setTimeout(() => {
                        if (!pickedBtn) {
                            coinsideAutopick();
                        }
                        setUserPlaceBetOn(true);
                        setAutoBetsLeft((prev) => prev - 1);
                    }, 1000);
                }
            }
            return () => clearTimeout(timeOutId);
        } else {
            if (!autoBet) {
                setAutoPick(false);
            }
            setPickedBtn(null);
            setUserPlaceBetOn(false);
        }
    }, [isspinning]);

    const pickClick = (pick) => {
        if (pick === "tails") {
            setPickedBtn("tails");
        } else if (pick === "heads") {
            setPickedBtn("heads");
        }
    };

    useEffect(() => {
        if (amount) {
            setLocalStorage("userDefaultCoinAmount", amount, 1000 * 60 * 60 * 2);
            dispatch({
                type: "SET",
                key: "coinselections",
                payload: state?.coinselections
                    ? {
                          ...state?.coinselections,
                          [coinnumber]: {
                              pick: pickedBtn,
                              amount: amount,
                              userbeton: userPlaceBetOn,
                          },
                      }
                    : {
                          [coinnumber]: {
                              pick: pickedBtn,
                              amount: amount,
                              userbeton: userPlaceBetOn,
                          },
                      },
            });
        }
    }, [amount, pickedBtn, userPlaceBetOn]);

    const autoBetToggle = () => {
        if (!autoBet) {
            if (autoBetsLeft <= 0) {
                setAutoBetsLeft(DEFAULT_AUTO_ROUNDS);
            }
            setAutoBet(true);
        } else {
            setAutoBet(false);
        }
    };

    const autoPickToggle = () => {
        if (!autoPick) {
            coinsideAutopick();
        }
        setAutoPick(!autoPick);
    };

    const clampAutoRounds = (value) => {
        if (Number.isNaN(value)) return DEFAULT_AUTO_ROUNDS;
        return Math.min(MAX_AUTO_ROUNDS, Math.max(0, value));
    };

    const userChangeAutopicks = (ev) => {
        const parsed = parseInt(ev.target.value, 10);
        setAutoBetsLeft(clampAutoRounds(Number.isNaN(parsed) ? 0 : parsed));
    };

    const unfocusAutoRounds = () => {
        if (autoBet) {
            // Mid-run edits set remaining rounds; 0 stops Auto Bet via the effect above.
            if (Number.isNaN(Number(autoBetsLeft)) || autoBetsLeft < 0) {
                setAutoBetsLeft(0);
            }
            return;
        }
        if (!autoBetsLeft || autoBetsLeft < 1) {
            setAutoBetsLeft(DEFAULT_AUTO_ROUNDS);
        }
    };

    const pressBetButton = () => {
        if (pickedBtn) {
            setUserPlaceBetOn(true);
        } else {
            setInputErrors({ ...inputErrors, userPick: "unpicked button" });
        }
    };

    useEffect(() => {
        if (state?.promptdepositrequest?.show) {
            setAutoBet(false);
        }
    }, [state?.promptdepositrequest]);

    const confirmed = nxtSession?.coinselections?.[coinnumber]?.userbeton;
    const hasPick = nxtSession?.coinselections?.[coinnumber]?.pick;

    return (
        <div className="sc-bet-panel" onClick={() => setcanplayTheitems()}>
            <div className="sc-bet-panel-top">
                <div className="sc-bet-manual">
                    <div className="sc-bet-field">
                        <label>Amount</label>
                        <div className="sc-amount-stepper">
                            <span className="sc-currency">KES</span>
                            <div className="sc-amount-controls">
                                <button
                                    type="button"
                                    className="sc-stepper-btn"
                                    onClick={() => changeAmount("decrease")}
                                    aria-label="Decrease amount"
                                >
                                    <CgRemove aria-hidden="true" />
                                </button>
                                <input
                                    onChange={(e) => amountChanged(e)}
                                    type="number"
                                    value={amount}
                                    min={minimumBetAmount}
                                    onBlur={unfocus}
                                    className="sc-amount-input"
                                    aria-label="Bet amount"
                                />
                                <button
                                    type="button"
                                    className="sc-stepper-btn"
                                    onClick={() => changeAmount("increase")}
                                    aria-label="Increase amount"
                                >
                                    <CgAdd aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="sc-bet-field">
                        <label>Odds</label>
                        <div className="sc-odds-value">
                            <span className="sc-odds-x">x</span>
                            <strong>2.00</strong>
                        </div>
                    </div>
                    <div className="sc-bet-field">
                        <label>Payout</label>
                        <div className="sc-payout-value">
                            KES. {(amount * 2).toFixed(2)}
                        </div>
                    </div>
                </div>

                <div className="sc-bet-auto">
                    <div className="sc-auto-card sc-auto-card--pick">
                        <div className="sc-auto-head">
                            <MdOutlineGpsFixed className="sc-auto-icon" />
                            <span className="sc-auto-label">Auto Pick</span>
                        </div>
                        <div className="sc-auto-controls">
                            <ScToggle
                                checked={autoPick}
                                onChange={autoPickToggle}
                                label="Auto Pick"
                            />
                            <div className={`sc-auto-rounds${autoBet ? " is-counting" : ""}`}>
                                <input
                                    type="number"
                                    value={autoBetsLeft}
                                    onChange={userChangeAutopicks}
                                    onBlur={unfocusAutoRounds}
                                    max={MAX_AUTO_ROUNDS}
                                    min={0}
                                    aria-label="Auto rounds"
                                    title={
                                        autoBet
                                            ? "Rounds left (editable)"
                                            : "Number of auto rounds"
                                    }
                                />
                            </div>
                        </div>
                    </div>
                    <div className="sc-auto-card sc-auto-card--bet">
                        <div className="sc-auto-head">
                            <GiTwoCoins className="sc-auto-icon" />
                            <span className="sc-auto-label">Auto Bet</span>
                        </div>
                        <div className="sc-auto-controls">
                            <ScToggle
                                checked={autoBet}
                                onChange={autoBetToggle}
                                label="Auto Bet"
                            />
                            {autoBet && !hasPick && !autoPick && (
                                <div className="autopick-hint">select auto pick</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className={`sc-bet-actions ${inputErrors?.userPick ? "pick-errors" : ""}`}>
                <button
                    type="button"
                    className={`sc-side-btn ${pickedBtn === "heads" ? "selected" : ""}`}
                    onClick={() => pickClick("heads")}
                >
                    <img src={HeadsCoin} alt="" className="sc-side-coin" />
                    HEADS
                    {hasPick === "heads" && <FaCheck className="sc-picked-check" />}
                </button>
                <button
                    type="button"
                    className={`sc-side-btn ${pickedBtn === "tails" ? "selected" : ""}`}
                    onClick={() => pickClick("tails")}
                >
                    <img src={TailsCoin} alt="" className="sc-side-coin" />
                    TAILS
                    {hasPick === "tails" && <FaCheck className="sc-picked-check" />}
                </button>
                <button
                    type="button"
                    disabled={!hasPick || confirmed}
                    className={`sc-confirm-btn ${!hasPick ? "disabled" : ""} ${
                        confirmed ? "confirmed" : ""
                    }`}
                    onClick={() => pressBetButton()}
                >
                    <FaCheckCircle />
                    {confirmed ? "CONFIRMED" : "CONFIRM PICK"}
                </button>
            </div>
        </div>
    );
};

export default React.memo(CoinStakeChoice);
