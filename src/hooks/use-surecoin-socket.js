import { useCallback, useContext, useEffect, useRef } from "react";
import { Context } from "../context/store";
import { useSureCoinRound } from "../context/surecoin-round";
import {
  connectSurecoinSocket,
  disconnectSurecoinSocket,
  getSurecoinSocket,
} from "../components/utils/surecoin-socket-connect";
import {
  getFromLocalStorage,
  setLocalStorage,
} from "../components/utils/local-storage";
import makeRequest from "../components/utils/fetch-request";
import { maskPlayerName } from "../components/pages/sure-coin/betting-sidebar/bets-feed";

const ROUND_EVENTS = [
  "round:sync",
  "round:waiting",
  "round:tick",
  "round:flip_start",
  "round:flip_tick",
  "round:result",
];

const BET_EVENTS = ["bet:accepted", "bet:rejected", "bet:resolved"];

const mapApiBet = (bet, index = 0) => ({
  id: bet.bet_id ?? bet.id ?? `api-${index}`,
  player: bet.display_name ?? maskPlayerName(bet.player ?? "player"),
  bet: Number(bet.stake ?? bet.bet ?? 0),
  choice: String(bet.coin_side ?? bet.choice ?? "heads").toLowerCase(),
  multiplier: bet.multiplier != null ? Number(bet.multiplier) : 2,
  win: bet.win != null ? Number(bet.win) : bet.payout != null ? Number(bet.payout) : null,
  settled: Boolean(bet.settled ?? (bet.status === "WON" || bet.status === "LOST")),
  won: Boolean(bet.won ?? bet.status === "WON"),
  at: bet.created_at ? new Date(bet.created_at).getTime() : Date.now(),
  rounds: bet.rounds ?? 1,
  avatarColor: bet.avatar_color ?? `#${((index * 9973) % 0xffffff).toString(16).padStart(6, "0")}`,
});

const useSurecoinSocket = () => {
  const [appState, appDispatch] = useContext(Context);
  const { state: roundState, dispatch: roundDispatch } = useSureCoinRound();
  const profileIdRef = useRef(null);
  const autoBetRef = useRef({ enabled: false, pick: null, amount: 5 });

  const applyBalanceUpdate = useCallback(
    (cash, bonus) => {
      const stored = getFromLocalStorage("user");
      if (!stored) return;

      const totalBalance =
        cash != null && bonus != null
          ? Number(cash) + Number(bonus)
          : stored.balance;

      const nextUser = {
        ...stored,
        balance: cash != null && bonus != null ? totalBalance : stored.balance,
        cash_balance: cash ?? stored.cash_balance,
        bonus_balance: bonus ?? stored.bonus_balance,
      };
      setLocalStorage("user", nextUser);

      if (!appState?.iscoinrotating) {
        appDispatch({ type: "SET", key: "user", payload: nextUser });
      }
    },
    [appDispatch, appState?.iscoinrotating]
  );

  const refreshBalance = useCallback(async () => {
    const user = getFromLocalStorage("user");
    if (!user?.token) return;

    const [balanceStatus, balance] = await makeRequest({
      url: "balance",
      method: "GET",
      api_version: "sureCoin",
    });

    if (balanceStatus === 200 && balance) {
      applyBalanceUpdate(balance.cash, balance.bonus);
    }
  }, [applyBalanceUpdate]);

  const handleRoundPayload = useCallback(
    (eventName, payload) => {
      if (eventName === "round:waiting") {
        roundDispatch({ type: "NEW_ROUND", payload });
        return;
      }
      if (eventName === "round:flip_start") {
        roundDispatch({
          type: "APPLY_ROUND",
          payload: {
            ...payload,
            phase: "FLIPPING",
            flip_seconds: payload?.flip_seconds,
          },
        });
        return;
      }
      if (eventName === "round:flip_tick") {
        roundDispatch({
          type: "APPLY_ROUND",
          payload: {
            ...payload,
            phase: "FLIPPING",
            progress: payload?.progress,
          },
        });
        return;
      }
      if (eventName === "round:result") {
        roundDispatch({ type: "APPLY_ROUND", payload });
        roundDispatch({
          type: "SETTLE_LIVE_BETS",
          payload: { winningSide: payload?.winning_side },
        });
        return;
      }
      roundDispatch({ type: "APPLY_ROUND", payload });
    },
    [roundDispatch]
  );

  const fetchConfig = useCallback(async () => {
    const [status, result] = await makeRequest({
      url: "config",
      method: "GET",
      api_version: "sureCoinPublic",
    });
    if (status === 200 && result) {
      roundDispatch({
        type: "SET_CONFIG",
        payload: {
          minBetAmount: Number(result.min_bet_amount ?? 5),
          payoutMultiplier: Number(result.payout_multiplier ?? 2),
          roundWaitSeconds: Number(result.round_wait_seconds ?? 6),
          roundFlipSeconds: Number(result.round_flip_seconds ?? 5),
          roundResultSeconds: Number(result.round_result_seconds ?? 2),
        },
      });
    }

    await refreshBalance();
  }, [roundDispatch, refreshBalance]);

  const fetchCurrentBets = useCallback(async () => {
    const [status, result] = await makeRequest({
      url: "round/current/bets?limit=50",
      method: "GET",
      api_version: "sureCoinPublic",
    });
    if (status === 200 && Array.isArray(result?.bets)) {
      result.bets.forEach((bet, idx) => {
        roundDispatch({ type: "ADD_LIVE_BET", payload: mapApiBet(bet, idx) });
      });
    }
  }, [roundDispatch]);

  const fetchLeaderboard = useCallback(
    async (period = "day", metric = "win") => {
      const [status, result] = await makeRequest({
        url: `leaderboard?period=${period}&metric=${metric}&limit=20`,
        method: "GET",
        api_version: "sureCoinPublic",
      });
      if (status === 200 && Array.isArray(result?.entries)) {
        roundDispatch({
          type: "SET_LEADERBOARD",
          payload: result.entries.map((entry, idx) => mapApiBet(entry, idx)),
        });
      }
    },
    [roundDispatch]
  );

  const placeBet = useCallback(
    ({ coinSide, betAmount, sessionId, idempotencyKey }) => {
      const socket = getSurecoinSocket();
      if (!socket.connected) {
        connectSurecoinSocket();
      }
      socket.emit("bet:place", {
        coin_side: String(coinSide).toUpperCase(),
        bet_amount: betAmount,
        session_id: sessionId,
        idempotency_key: idempotencyKey,
      });
    },
    []
  );

  useEffect(() => {
    const user = appState?.user || getFromLocalStorage("user");
    const profileId = user?.profile_id;
    const token = user?.token;

    profileIdRef.current = profileId || null;
    const socket = connectSurecoinSocket();

    fetchConfig();
    fetchCurrentBets();
    fetchLeaderboard();

    const onConnect = () => {
      roundDispatch({ type: "SET_CONNECTED", payload: true });
    };

    const onDisconnect = () => {
      roundDispatch({ type: "SET_CONNECTED", payload: false });
    };

    const onConnectError = () => {
      roundDispatch({ type: "SET_CONNECTED", payload: false });
    };

    const lastTickMsRef = { current: 0 };
    const onRoundEvent = (eventName, payload) => {
      if (eventName === "round:tick") {
        const now = Date.now();
        if (now - lastTickMsRef.current < 900) {
          return;
        }
        lastTickMsRef.current = now;
      }
      handleRoundPayload(eventName, payload);
    };

    const roundEventHandlers = Object.fromEntries(
      ROUND_EVENTS.map((eventName) => [
        eventName,
        (payload) => onRoundEvent(eventName, payload),
      ])
    );

    ROUND_EVENTS.forEach((eventName) => {
      socket.on(eventName, roundEventHandlers[eventName]);
    });

    socket.on("round:bet", (payload) => {
      roundDispatch({ type: "ADD_LIVE_BET", payload: mapApiBet(payload) });
    });

    socket.on("round:bets_settled", (payload) => {
      if (Array.isArray(payload?.bets)) {
        const settled = payload.bets.map((bet, idx) => mapApiBet(bet, idx));
        roundDispatch({
          type: "ARCHIVE_LIVE_BETS",
          payload: settled,
        });
      }
    });

    socket.on("bet:accepted", (payload) => {
      roundDispatch({
        type: "SET_MY_BET",
        payload: {
          betId: payload.bet_id,
          coinSide: payload.coin_side,
          stake: payload.stake,
          possibleWin: payload.possible_win,
          roundId: payload.round_id,
        },
      });
    });

    socket.on("bet:rejected", (payload) => {
      const reason = String(payload?.reason ?? "Unable to place bet");
      appDispatch({
        type: "SET",
        key: "coinsAlertMsg",
        payload: { status: 400, message: reason },
      });
      if (/insuff/i.test(reason)) {
        appDispatch({
          type: "SET",
          key: "promptdepositrequest",
          payload: { show: true, message: reason },
        });
      }
    });

    socket.on("bet:resolved", (payload) => {
      roundDispatch({
        type: "SET_LAST_RESOLVED",
        payload: {
          betId: payload.bet_id,
          roundId: payload.round_id,
          win: payload.won,
          payout: payload.payout,
        },
      });
      refreshBalance();
    });

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      ROUND_EVENTS.forEach((eventName) => {
        socket.off(eventName, roundEventHandlers[eventName]);
      });
      BET_EVENTS.forEach((eventName) => {
        socket.off(eventName);
      });
      socket.off("round:bet");
      socket.off("round:bets_settled");
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      disconnectSurecoinSocket();
    };
  }, [
    appState?.user?.profile_id,
    appState?.user?.token,
    appDispatch,
    roundDispatch,
    handleRoundPayload,
    applyBalanceUpdate,
    fetchConfig,
    fetchCurrentBets,
    fetchLeaderboard,
    refreshBalance,
  ]);

  return { placeBet, fetchLeaderboard, roundState, autoBetRef };
};

export default useSurecoinSocket;
