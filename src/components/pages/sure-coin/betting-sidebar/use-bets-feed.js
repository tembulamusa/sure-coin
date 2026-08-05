import { useCallback, useEffect, useMemo, useState } from "react";
import { useSureCoinRound } from "../../../../context/surecoin-round";
import makeRequest from "../../../utils/fetch-request";
import { sortTopWins, sumWins } from "./bets-feed";

const mapBetRow = (bet, index = 0) => ({
  id: bet.id ?? bet.bet_id ?? `bet-${index}`,
  player: bet.player ?? bet.display_name ?? "Player***",
  bet: Number(bet.bet ?? bet.stake ?? 0),
  choice: String(bet.choice ?? bet.coin_side ?? "heads").toLowerCase(),
  multiplier: bet.multiplier != null ? Number(bet.multiplier) : 2,
  win: bet.win != null ? Number(bet.win) : null,
  settled: Boolean(bet.settled),
  won: Boolean(bet.won),
  at: bet.at ?? Date.now(),
  rounds: bet.rounds ?? 1,
  avatarColor:
    bet.avatarColor ??
    bet.avatar_color ??
    `#${((index * 9973) % 0xffffff).toString(16).padStart(6, "0")}`,
});

const useBetsFeed = ({ isSpinning, roundStats, lastOutcome }) => {
  const { state: roundState, dispatch: roundDispatch } = useSureCoinRound();
  const [visibleCount, setVisibleCount] = useState(12);
  const [loading, setLoading] = useState(true);
  const [topPeriod, setTopPeriod] = useState("day");
  const [topMetric, setTopMetric] = useState("win");
  const [previousBets, setPreviousBets] = useState([]);

  const allBets = useMemo(
    () => roundState.liveBets.map((bet, idx) => mapBetRow(bet, idx)),
    [roundState.liveBets]
  );

  const topBets = useMemo(() => {
    const leaderboard = roundState.leaderboard.map((bet, idx) => mapBetRow(bet, idx));
    return sortTopWins(leaderboard.length ? leaderboard : previousBets);
  }, [roundState.leaderboard, previousBets]);

  const fetchPreviousBets = useCallback(async () => {
    const [status, result] = await makeRequest({
      url: "rounds/previous/bets?limit=50",
      method: "GET",
      api_version: "sureCoinPublic",
    });
    if (status === 200 && Array.isArray(result?.bets)) {
      setPreviousBets(result.bets.map((bet, idx) => mapBetRow(bet, idx)));
    }
  }, []);

  const fetchLeaderboard = useCallback(async (period, metric) => {
    const [status, result] = await makeRequest({
      url: `leaderboard?period=${period}&metric=${metric}&limit=20`,
      method: "GET",
      api_version: "sureCoinPublic",
    });
    if (status === 200 && Array.isArray(result?.entries)) {
      return result.entries.map((bet, idx) => mapBetRow(bet, idx));
    }
    return [];
  }, []);

  useEffect(() => {
    Promise.all([fetchPreviousBets()]).finally(() => setLoading(false));
  }, [fetchPreviousBets]);

  useEffect(() => {
    if (roundState.phase === "RESULT" && roundState.previousRoundBets?.length) {
      setPreviousBets(roundState.previousRoundBets.map((bet, idx) => mapBetRow(bet, idx)));
    }
  }, [roundState.phase, roundState.previousRoundBets]);

  useEffect(() => {
    if (roundState.phase === "RESULT" && lastOutcome) {
      fetchPreviousBets();
    }
  }, [roundState.phase, lastOutcome, fetchPreviousBets]);

  const buildSummary = useCallback((bets, expectedOverride) => {
    const placed = bets.length;
    const expected = expectedOverride ?? Math.max(roundStats?.bets ?? placed, placed, 1);
    return {
      placed,
      expected,
      totalWin: sumWins(bets.filter((b) => b.settled && Number(b.win) > 0)),
      avatars: bets.slice(0, 5),
    };
  }, [roundStats?.bets]);

  const summaries = useMemo(
    () => ({
      all: buildSummary(allBets, roundStats?.bets),
      previous: buildSummary(previousBets, previousBets.length || 1),
      top: buildSummary(topBets, topBets.length || 1),
    }),
    [allBets, previousBets, topBets, buildSummary, roundStats?.bets]
  );

  const getTabBets = useCallback(
    (tab) => {
      if (tab === "previous") return previousBets;
      if (tab === "top") return topBets;
      return allBets;
    },
    [allBets, previousBets, topBets]
  );

  const viewMore = useCallback(() => setVisibleCount((prev) => prev + 12), []);
  const resetVisible = useCallback(() => setVisibleCount(12), []);

  const applyTopFilters = useCallback(
    async (period, metric) => {
      setTopPeriod(period);
      setTopMetric(metric);
      setLoading(true);
      const entries = await fetchLeaderboard(period, metric);
      roundDispatch({ type: "SET_LEADERBOARD", payload: entries });
      setLoading(false);
    },
    [fetchLeaderboard, roundDispatch]
  );

  return {
    summaries,
    getTabBets,
    visibleCount,
    viewMore,
    resetVisible,
    loading,
    hasMore: (tab) => getTabBets(tab).length > visibleCount,
    topPeriod,
    topMetric,
    applyTopFilters,
    isSpinning,
  };
};

export default useBetsFeed;
