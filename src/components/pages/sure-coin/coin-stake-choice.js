import React, { useContext, useEffect, useRef, useState } from "react";
import { Context } from "../../../context/store";
import { useSureCoinRound } from "../../../context/surecoin-round";
import {
  connectSurecoinSocket,
  getSurecoinSocket,
} from "../../utils/surecoin-socket-connect";
import { unlockSurecoinAudio } from "../../utils/surecoin-sound";
import { getFromLocalStorage, setLocalStorage } from "../../utils/local-storage";
import {
  canConfirmPick,
  canSelectSide,
  createPendingBet,
  shouldQueueForNextRound,
} from "../../utils/surecoin-pending-bet";
import { FaCheck, FaCheckCircle } from "react-icons/fa";
import { CgAdd, CgRemove } from "react-icons/cg";
import { GiTwoCoins } from "react-icons/gi";
import { MdOutlineGpsFixed } from "react-icons/md";
import HeadsCoin from "../../../assets/surecoin/heads.png";
import TailsCoin from "../../../assets/surecoin/tails.png";

const DEFAULT_AUTO_ROUNDS = 10;
const MAX_AUTO_ROUNDS = 99;
/** Max wait for bet:accepted / bet:rejected after emitting bet:place. */
const PLACE_BET_TIMEOUT_MS = 10000;

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
    const { canPlaceBet, state: roundState } = useSureCoinRound();
    const [amount, setAmount] = useState(5);
    const [inputErrors, setInputErrors] = useState({});
    const [defaultAmountChange] = useState(10);
    const [pickedBtn, setPickedBtn] = useState(null);
    const [autoBet, setAutoBet] = useState(false);
    const [autoBetsLeft, setAutoBetsLeft] = useState(DEFAULT_AUTO_ROUNDS);
    const [userPlaceBetOn, setUserPlaceBetOn] = useState(false);
    const [autoPick, setAutoPick] = useState(false);
    const [pendingBet, setPendingBet] = useState(null);
    const pendingBetRef = useRef(null);
    const placedForRoundRef = useRef(null);
    const autoBetPendingRef = useRef(false);
    const placeBetTimeoutRef = useRef(null);

    const minimumBetAmount = roundState.config?.minBetAmount ?? 5;
    const payoutMultiplier = roundState.config?.payoutMultiplier ?? 2;
    const user = state?.user || getFromLocalStorage("user");
    const hasConfirmedBet = Boolean(roundState.myBet);
    const confirmed = userPlaceBetOn && hasConfirmedBet;
    const hasNextRoundQueue = Boolean(pendingBet);
    const phase = roundState.phase;

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

    useEffect(() => {
        pendingBetRef.current = pendingBet;
    }, [pendingBet]);

    const coinsideAutopick = () => {
        const choices = ["heads", "tails"];
        setPickedBtn(choices[Math.floor(Math.random() * 2)]);
    };

    const currentRoundKey = () => roundState.roundId ?? roundState.roundNumber ?? null;

    const clearPendingBet = () => {
        pendingBetRef.current = null;
        setPendingBet(null);
    };

    const clearPlaceBetTimeout = () => {
        if (placeBetTimeoutRef.current == null) return;
        clearTimeout(placeBetTimeoutRef.current);
        placeBetTimeoutRef.current = null;
    };

    const unlockPlaceBetUi = () => {
        placedForRoundRef.current = null;
        setUserPlaceBetOn(false);
        clearPendingBet();
    };

    const armPlaceBetTimeout = () => {
        clearPlaceBetTimeout();
        placeBetTimeoutRef.current = setTimeout(() => {
            placeBetTimeoutRef.current = null;
            unlockPlaceBetUi();
            dispatch({
                type: "SET",
                key: "coinsAlertMsg",
                payload: {
                    status: 400,
                    message: "Bet timed out — no response from server",
                },
            });
        }, PLACE_BET_TIMEOUT_MS);
    };

    const emitBet = (pick, stake) => {
        if (!user?.profile_id || !pick) return false;

        const roundKey = currentRoundKey();
        if (roundKey != null && placedForRoundRef.current === roundKey) {
            return false;
        }

        const socket = getSurecoinSocket();
        if (!socket.connected) {
            connectSurecoinSocket();
        }

        const sessionId = `${user.profile_id}:${roundKey ?? "round"}`;
        const idempotencyKey = `${user.profile_id}-${roundKey ?? "round"}-${Date.now()}`;

        if (roundKey != null) {
            placedForRoundRef.current = roundKey;
        }

        socket.emit("bet:place", {
            coin_side: String(pick).toUpperCase(),
            bet_amount: stake,
            session_id: sessionId,
            idempotency_key: idempotencyKey,
        });
        armPlaceBetTimeout();
        return true;
    };

    const queuePendingBet = (pick, stake, message) => {
        const next = createPendingBet(pick, stake);
        pendingBetRef.current = next;
        setPendingBet(next);
        setPickedBtn(String(pick).toLowerCase());
        setUserPlaceBetOn(true);
        dispatch({
            type: "SET",
            key: "coinsAlertMsg",
            payload: {
                status: 200,
                message:
                    message ||
                    `Pick queued for next round (${String(pick).toUpperCase()}, KES ${stake})`,
            },
        });
    };

    const promptLogin = () => {
        dispatch({
            type: "SET",
            key: "coinsAlertMsg",
            payload: { status: 400, message: "Please login to place a bet" },
        });
        dispatch({ type: "SET", key: "authModalMode", payload: "login" });
        dispatch({ type: "SET", key: "showloginmodal", payload: true });
    };

    const placeConfirmedBet = async (pick = pickedBtn, stake = amount, { fromAuto = false } = {}) => {
        const side = pick || state?.coinselections?.[coinnumber]?.pick;
        if (!side) {
            setInputErrors({ ...inputErrors, userPick: "unpicked button" });
            return;
        }

        if (!user?.profile_id) {
            promptLogin();
            return;
        }

        if (!isOnline || !isDocumentVisible) {
            queuePendingBet(
                side,
                stake,
                !isOnline
                    ? `Offline — queued for next round (${String(side).toUpperCase()}, KES ${stake})`
                    : `Tab hidden — queued for next round (${String(side).toUpperCase()}, KES ${stake})`
            );
            return;
        }

        await unlockSurecoinAudio();

        if (shouldQueueForNextRound({ canPlaceBet, isOnline, isDocumentVisible })) {
            queuePendingBet(side, stake);
            return;
        }

        setUserPlaceBetOn(true);
        clearPendingBet();
        const placed = emitBet(side, stake);
        if (placed && fromAuto) {
            setAutoBetsLeft((prev) => prev - 1);
        }
    };

    // Flush next-round queue when WAITING / canPlaceBet opens.
    useEffect(() => {
        const queued = pendingBetRef.current;
        if (!queued || !canPlaceBet || !user?.profile_id) return;
        if (!isOnline || !isDocumentVisible) return;
        if (hasConfirmedBet) {
            clearPendingBet();
            return;
        }

        const roundKey = currentRoundKey();
        if (roundKey != null && placedForRoundRef.current === roundKey) {
            clearPendingBet();
            return;
        }

        const side = queued.pick;
        const stake = Math.max(queued.amount, minimumBetAmount);
        setPickedBtn(side);
        setAmount(stake);
        setUserPlaceBetOn(true);
        clearPendingBet();
        const placed = emitBet(side, stake);

        if (placed && autoBet && autoBetsLeft > 0) {
            setAutoBetsLeft((prev) => prev - 1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- flush once per open window
    }, [
        canPlaceBet,
        hasConfirmedBet,
        roundState.roundId,
        isOnline,
        isDocumentVisible,
        user?.profile_id,
    ]);

    // Auto-bet for current WAITING window (skips if a next-round queue is pending/flushing).
    useEffect(() => {
        if (pendingBetRef.current) return;
        if (autoBetPendingRef.current) return;
        if (!autoBet || autoBetsLeft <= 0 || !canPlaceBet || hasConfirmedBet) return;
        if (!user?.profile_id || !isOnline || !isDocumentVisible) return;

        const roundKey = currentRoundKey();
        if (roundKey != null && placedForRoundRef.current === roundKey) return;

        autoBetPendingRef.current = true;
        const timer = setTimeout(() => {
            autoBetPendingRef.current = false;
            if (pendingBetRef.current || !canPlaceBet || hasConfirmedBet) return;
            if (roundKey != null && placedForRoundRef.current === roundKey) return;

            let side = pickedBtn;
            if (!side && autoPick) {
                const choices = ["heads", "tails"];
                side = choices[Math.floor(Math.random() * 2)];
                setPickedBtn(side);
            }
            if (side) {
                placeConfirmedBet(side, amount, { fromAuto: true });
            }
        }, 800);

        return () => {
            autoBetPendingRef.current = false;
            clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roundState.roundId, canPlaceBet, hasConfirmedBet, autoBet, autoBetsLeft, isspinning]);

    useEffect(() => {
        if (roundState.phase === "WAITING" && roundState.myBet) {
            clearPlaceBetTimeout();
            setUserPlaceBetOn(true);
            setPickedBtn(String(roundState.myBet.coinSide).toLowerCase());
            clearPendingBet();
            return;
        }
        if (roundState.phase === "WAITING" && !roundState.myBet) {
            const roundKey = currentRoundKey();
            const placedThisRound =
                roundKey != null && placedForRoundRef.current === roundKey;
            if (!pendingBetRef.current && !placedThisRound) {
                clearPlaceBetTimeout();
                setUserPlaceBetOn(false);
            }
        }
    }, [roundState.phase, roundState.myBet, roundState.roundId]);

    // Clear place-bet wait as soon as the server accepts (myBet set).
    useEffect(() => {
        if (roundState.myBet) {
            clearPlaceBetTimeout();
        }
    }, [roundState.myBet]);

    // On bet rejection / timeout alert, allow re-confirm / clear stale pending.
    useEffect(() => {
        const alert = state?.coinsAlertMsg;
        if (!alert || alert.status === 200) return;
        // Login prompt is not a bet failure — leave any next-round queue intact.
        if (/please login/i.test(String(alert.message || ""))) return;
        clearPlaceBetTimeout();
        unlockPlaceBetUi();
    }, [state?.coinsAlertMsg]);

    useEffect(() => () => clearPlaceBetTimeout(), []);

    const pickClick = async (pick) => {
        await unlockSurecoinAudio();
        setPickedBtn(pick);
        setInputErrors((prev) => {
            if (!prev?.userPick) return prev;
            const next = { ...prev };
            delete next.userPick;
            return next;
        });
        // If already queued for next round, update the queued side.
        if (pendingBetRef.current) {
            const stake = pendingBetRef.current.amount || amount;
            const next = createPendingBet(pick, stake);
            pendingBetRef.current = next;
            setPendingBet(next);
            setUserPlaceBetOn(true);
        }
    };

    useEffect(() => {
        if (!amount) return;

        setLocalStorage("userDefaultCoinAmount", amount, 1000 * 60 * 60 * 2);

        const existing = state?.coinselections?.[coinnumber];
        if (
            existing &&
            existing.pick === pickedBtn &&
            existing.amount === amount &&
            existing.userbeton === userPlaceBetOn
        ) {
            return;
        }

        dispatch({
            type: "SET",
            key: "coinselections",
            payload: {
                ...(state?.coinselections || {}),
                [coinnumber]: {
                    pick: pickedBtn,
                    amount,
                    userbeton: userPlaceBetOn,
                    pendingNextRound: Boolean(pendingBet),
                },
            },
        });
    }, [amount, pickedBtn, userPlaceBetOn, pendingBet, coinnumber, dispatch, state?.coinselections]);

    // Keep queued stake in sync when amount changes while pending.
    useEffect(() => {
        if (!pendingBetRef.current || !pickedBtn) return;
        if (Number(pendingBetRef.current.amount) === Number(amount)) return;
        const next = createPendingBet(pickedBtn, amount);
        pendingBetRef.current = next;
        setPendingBet(next);
    }, [amount, pickedBtn]);

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
    const sideLocked =
        !canSelectSide({ phase, myBet: roundState.myBet }) ||
        (phase === "WAITING" && hasConfirmedBet);
    const confirmDisabled =
        !canConfirmPick({ hasPick, phase, myBet: roundState.myBet }) ||
        (phase === "WAITING" && confirmed);

    let confirmLabel = "CONFIRM PICK";
    let confirmClass = "";
    if (confirmed && phase === "WAITING") {
        confirmLabel = "CONFIRMED";
        confirmClass = "confirmed";
    } else if (hasNextRoundQueue) {
        confirmLabel = "NEXT ROUND";
        confirmClass = "pending-next";
    }

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

            {hasNextRoundQueue && (
                <div className="sc-next-round-hint" role="status">
                    Queued for next round — {String(pendingBet.pick).toUpperCase()} · KES{" "}
                    {pendingBet.amount}
                </div>
            )}

            <div className={`sc-bet-actions ${inputErrors?.userPick ? "pick-errors" : ""}`}>
                <button
                    type="button"
                    className={`sc-side-btn ${pickedBtn === "heads" ? "selected" : ""}`}
                    onClick={() => pickClick("heads")}
                    disabled={sideLocked}
                >
                    <img src={HeadsCoin} alt="" className="sc-side-coin" />
                    HEADS
                    {hasPick === "heads" && <FaCheck className="sc-picked-check" />}
                </button>
                <button
                    type="button"
                    className={`sc-side-btn ${pickedBtn === "tails" ? "selected" : ""}`}
                    onClick={() => pickClick("tails")}
                    disabled={sideLocked}
                >
                    <img src={TailsCoin} alt="" className="sc-side-coin" />
                    TAILS
                    {hasPick === "tails" && <FaCheck className="sc-picked-check" />}
                </button>
                <button
                    type="button"
                    disabled={confirmDisabled}
                    className={`sc-confirm-btn ${!hasPick ? "disabled" : ""} ${confirmClass}`}
                    onClick={() => placeConfirmedBet()}
                >
                    <FaCheckCircle />
                    {confirmLabel}
                </button>
            </div>
        </div>
    );
};

export default React.memo(CoinStakeChoice);
