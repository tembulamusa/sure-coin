import React, { useContext, useEffect, useRef, useState } from "react";
import { Context } from "../../../context/store";
import { useSureCoinRound } from "../../../context/surecoin-round";
import {
  connectSurecoinSocket,
  getSurecoinSocket,
} from "../../utils/surecoin-socket-connect";
import { unlockSurecoinAudio } from "../../utils/surecoin-sound";
import { getFromLocalStorage, setLocalStorage } from "../../utils/local-storage";
import { FaCheck, FaCheckCircle } from "react-icons/fa";
import { CgAdd, CgRemove } from "react-icons/cg";
import { GiTwoCoins } from "react-icons/gi";
import { MdOutlineGpsFixed } from "react-icons/md";
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
    const { coinnumber, isspinning, isDocumentVisible, isOnline } = props;
    const [state, dispatch] = useContext(Context);
    const { canPlaceBet, canPickSide, state: roundState } = useSureCoinRound();
    const [amount, setAmount] = useState(5);
    const [inputErrors, setInputErrors] = useState({});
    const [defaultAmountChange] = useState(10);
    const [pickedBtn, setPickedBtn] = useState(null);
    const [autoBet, setAutoBet] = useState(false);
    const [autoBetsLeft, setAutoBetsLeft] = useState(DEFAULT_AUTO_ROUNDS);
    const [userPlaceBetOn, setUserPlaceBetOn] = useState(false);
    const [autoPick, setAutoPick] = useState(false);
    const autoBetPendingRef = useRef(false);

    const minimumBetAmount = roundState.config?.minBetAmount ?? 5;
    const payoutMultiplier = roundState.config?.payoutMultiplier ?? 2;
    const user = state?.user || getFromLocalStorage("user");
    const hasConfirmedBet = Boolean(roundState.myBet);
    const confirmed = userPlaceBetOn && hasConfirmedBet;

    const setcanplayTheitems = () => {
        const itemtoplay = `canplayitems-${coinnumber}`;
        if (!state?.[itemtoplay]) {
            dispatch({ type: "SET", key: itemtoplay, payload: true });
        }
    };

    const amountChanged = (e) => {
        setAmount(parseInt(e.target.value, 10) || minimumBetAmount);
    };

    const unfocus = () => {
        if (amount < minimumBetAmount) {
            setAmount(minimumBetAmount);
        }
    };

    useEffect(() => {
        const getDefaultUserAmount = getFromLocalStorage("userDefaultCoinAmount");
        if (getDefaultUserAmount) {
            setAmount(Math.max(getDefaultUserAmount, minimumBetAmount));
        } else {
            setAmount(minimumBetAmount);
        }
    }, [minimumBetAmount]);

    const changeAmount = (changeType) => {
        if (changeType === "increase") {
            setAmount(defaultAmountChange + amount);
        } else if (changeType === "decrease") {
            const newAmount = amount - defaultAmountChange;
            setAmount(newAmount > minimumBetAmount ? newAmount : minimumBetAmount);
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
        setPickedBtn(choices[Math.floor(Math.random() * 2)]);
    };

    const emitBet = (pick, stake) => {
        if (!user?.profile_id || !pick) return;

        const socket = getSurecoinSocket();
        if (!socket.connected) {
            connectSurecoinSocket();
        }

        const sessionId = `${user.profile_id}:${roundState.roundId ?? roundState.roundNumber}`;
        const idempotencyKey = `${user.profile_id}-${roundState.roundId ?? "round"}-${Date.now()}`;

        socket.emit("bet:place", {
            coin_side: String(pick).toUpperCase(),
            bet_amount: stake,
            session_id: sessionId,
            idempotency_key: idempotencyKey,
        });
    };

    const placeConfirmedBet = (pick = pickedBtn, stake = amount) => {
        if (!pick) {
            setInputErrors({ ...inputErrors, userPick: "unpicked button" });
            return;
        }
        if (!canPlaceBet || !user?.profile_id || !isOnline || !isDocumentVisible) {
            return;
        }
        setUserPlaceBetOn(true);
        emitBet(pick, stake);
    };

    useEffect(() => {
        if (isspinning) {
            setPickedBtn(null);
            setUserPlaceBetOn(false);
            return;
        }

        if (autoBet && autoBetsLeft > 0 && canPlaceBet && !hasConfirmedBet) {
            const timer = setTimeout(() => {
                let side = pickedBtn;
                if (!side && autoPick) {
                    const choices = ["heads", "tails"];
                    side = choices[Math.floor(Math.random() * 2)];
                    setPickedBtn(side);
                }
                if (side) {
                    placeConfirmedBet(side, amount);
                    setAutoBetsLeft((prev) => prev - 1);
                }
            }, 800);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [roundState.roundId, canPlaceBet, hasConfirmedBet, autoBet, autoBetsLeft, isspinning]);

    useEffect(() => {
        if (roundState.phase === "WAITING" && roundState.myBet) {
            setUserPlaceBetOn(true);
            setPickedBtn(String(roundState.myBet.coinSide).toLowerCase());
        }
        if (roundState.phase === "WAITING" && !roundState.myBet) {
            setUserPlaceBetOn(false);
        }
    }, [roundState.phase, roundState.myBet, roundState.roundId]);

    const pickClick = async (pick) => {
        await unlockSurecoinAudio();
        setPickedBtn(pick);
    };

    useEffect(() => {
        if (amount) {
            setLocalStorage("userDefaultCoinAmount", amount, 1000 * 60 * 60 * 2);
            dispatch({
                type: "SET",
                key: "coinselections",
                payload: state?.coinselections
                    ? {
                          ...state.coinselections,
                          [coinnumber]: {
                              pick: pickedBtn,
                              amount,
                              userbeton: userPlaceBetOn,
                          },
                      }
                    : {
                          [coinnumber]: {
                              pick: pickedBtn,
                              amount,
                              userbeton: userPlaceBetOn,
                          },
                      },
            });
        }
    }, [amount, pickedBtn, userPlaceBetOn, coinnumber, dispatch, state?.coinselections]);

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
            if (Number.isNaN(Number(autoBetsLeft)) || autoBetsLeft < 0) {
                setAutoBetsLeft(0);
            }
            return;
        }
        if (!autoBetsLeft || autoBetsLeft < 1) {
            setAutoBetsLeft(DEFAULT_AUTO_ROUNDS);
        }
    };

    useEffect(() => {
        if (state?.promptdepositrequest?.show) {
            setAutoBet(false);
        }
    }, [state?.promptdepositrequest]);

    const hasPick = pickedBtn || state?.coinselections?.[coinnumber]?.pick;

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
                                    onChange={amountChanged}
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
                            <strong>{payoutMultiplier.toFixed(2)}</strong>
                        </div>
                    </div>
                    <div className="sc-bet-field">
                        <label>Payout</label>
                        <div className="sc-payout-value">
                            KES. {(amount * payoutMultiplier).toFixed(2)}
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
                    disabled={hasConfirmedBet || !canPickSide}
                >
                    <img src={HeadsCoin} alt="" className="sc-side-coin" />
                    HEADS
                    {hasPick === "heads" && <FaCheck className="sc-picked-check" />}
                </button>
                <button
                    type="button"
                    className={`sc-side-btn ${pickedBtn === "tails" ? "selected" : ""}`}
                    onClick={() => pickClick("tails")}
                    disabled={hasConfirmedBet || !canPickSide}
                >
                    <img src={TailsCoin} alt="" className="sc-side-coin" />
                    TAILS
                    {hasPick === "tails" && <FaCheck className="sc-picked-check" />}
                </button>
                <button
                    type="button"
                    disabled={!hasPick || confirmed || !canPlaceBet || !user?.profile_id}
                    className={`sc-confirm-btn ${!hasPick ? "disabled" : ""} ${
                        confirmed ? "confirmed" : ""
                    }`}
                    onClick={() => placeConfirmedBet()}
                >
                    <FaCheckCircle />
                    {confirmed ? "CONFIRMED" : "CONFIRM PICK"}
                </button>
            </div>
        </div>
    );
};

export default React.memo(CoinStakeChoice);
