import { createContext, useContext, useMemo, useReducer } from "react";

export const initialRoundState = {
  connected: false,
  roundId: null,
  roundNumber: null,
  phase: null,
  secondsRemaining: 0,
  waitSeconds: 6,
  flipSeconds: 5,
  flipProgress: 0,
  betCount: 0,
  headsCount: 0,
  tailsCount: 0,
  totalStake: 0,
  winningSide: null,
  myBet: null,
  lastResolved: null,
  config: {
    minBetAmount: 5,
    payoutMultiplier: 2,
    roundWaitSeconds: 6,
    roundFlipSeconds: 5,
    roundResultSeconds: 2,
  },
  liveBets: [],
  previousRoundBets: [],
  leaderboard: [],
};

const mergeRoundPayload = (state, payload = {}) => ({
  ...state,
  roundId: payload.round_id ?? state.roundId,
  roundNumber: payload.round_number ?? state.roundNumber,
  phase: payload.phase ?? state.phase,
  secondsRemaining:
    payload.seconds_remaining != null
      ? payload.seconds_remaining
      : payload.flip_seconds != null && payload.phase === "FLIPPING"
        ? payload.flip_seconds
        : state.secondsRemaining,
  betCount: payload.bet_count ?? state.betCount,
  headsCount: payload.heads_count ?? state.headsCount,
  tailsCount: payload.tails_count ?? state.tailsCount,
  totalStake: payload.total_stake ?? state.totalStake,
  winningSide: payload.winning_side ?? state.winningSide,
  waitSeconds: payload.wait_seconds ?? state.waitSeconds,
  flipSeconds: payload.flip_seconds ?? state.flipSeconds,
  flipProgress: payload.progress ?? state.flipProgress,
});

const roundReducer = (state, action) => {
  switch (action.type) {
    case "SET_CONNECTED":
      return { ...state, connected: action.payload };
    case "APPLY_ROUND":
      return mergeRoundPayload(state, action.payload);
    case "NEW_ROUND":
      return {
        ...mergeRoundPayload(
          {
            ...state,
            winningSide: null,
            flipProgress: 0,
            myBet: null,
            lastResolved: null,
            liveBets: [],
          },
          action.payload
        ),
      };
    case "SET_MY_BET":
      return { ...state, myBet: action.payload };
    case "SET_LAST_RESOLVED":
      return { ...state, lastResolved: action.payload };
    case "ADD_LIVE_BET":
      return {
        ...state,
        liveBets: [action.payload, ...state.liveBets.filter((b) => b.id !== action.payload.id)].slice(
          0,
          320
        ),
      };
    case "SETTLE_LIVE_BETS":
      return {
        ...state,
        liveBets: state.liveBets.map((bet) => {
          const won =
            action.payload?.winningSide &&
            bet.choice === String(action.payload.winningSide).toLowerCase();
          return {
            ...bet,
            settled: true,
            won: Boolean(won),
            multiplier: won ? bet.multiplier ?? 2 : null,
            win: won ? bet.bet * (bet.multiplier ?? 2) : null,
          };
        }),
      };
    case "ARCHIVE_LIVE_BETS":
      return {
        ...state,
        previousRoundBets: action.payload?.length ? action.payload : state.liveBets,
        liveBets: [],
      };
    case "SET_CONFIG":
      return { ...state, config: { ...state.config, ...action.payload } };
    case "SET_LEADERBOARD":
      return { ...state, leaderboard: action.payload ?? [] };
    default:
      return state;
  }
};

const SureCoinRoundContext = createContext(null);

export const SureCoinRoundProvider = ({ children }) => {
  const [state, dispatch] = useReducer(roundReducer, initialRoundState);

  const roundStats = useMemo(() => {
    const totalSides = state.headsCount + state.tailsCount;
    const headsPct =
      totalSides > 0 ? Math.round((state.headsCount / totalSides) * 100) : 50;
    return {
      round: state.roundNumber,
      bets: state.betCount,
      heads: headsPct,
      tails: 100 - headsPct,
    };
  }, [state.roundNumber, state.betCount, state.headsCount, state.tailsCount]);

  const isSpinning = state.phase === "FLIPPING";
  const isWaiting = state.phase === "WAITING";
  const canPickSide = isWaiting && !state.myBet;
  const canPlaceBet =
    state.connected && isWaiting && state.secondsRemaining >= 0 && !state.myBet;

  const value = useMemo(
    () => ({
      state,
      dispatch,
      roundStats,
      isSpinning,
      isWaiting,
      canPickSide,
      canPlaceBet,
    }),
    [state, roundStats, isSpinning, isWaiting, canPickSide, canPlaceBet]
  );

  return (
    <SureCoinRoundContext.Provider value={value}>
      {children}
    </SureCoinRoundContext.Provider>
  );
};

export const useSureCoinRound = () => {
  const ctx = useContext(SureCoinRoundContext);
  if (!ctx) {
    throw new Error("useSureCoinRound must be used within SureCoinRoundProvider");
  }
  return ctx;
};

export const useSureCoinRoundOptional = () => useContext(SureCoinRoundContext);

export default SureCoinRoundContext;
