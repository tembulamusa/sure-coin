import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createBetEntry,
  randomBetAmount,
  settleBets,
  sortTopWins,
  sumWins,
} from "./bets-feed";

const SETTLE_HOLD_MS = 1800;

/**
 * Aviator-style bet feed:
 * - All Bets: live round bets (grow while open; win stays empty until outcome)
 * - Settle when the coin result lands (spin end), not while the round is open
 * - Previous: last completed round
 * - Top: highest wins across recent rounds
 */
const useBetsFeed = ({ isSpinning, roundStats, lastOutcome }) => {
  const [allBets, setAllBets] = useState([]);
  const [previousBets, setPreviousBets] = useState([]);
  const [topBets, setTopBets] = useState([]);
  const [visibleCount, setVisibleCount] = useState(12);
  const [expectedBets, setExpectedBets] = useState(262);
  const [loading, setLoading] = useState(true);
  const [revealHold, setRevealHold] = useState(false);
  const betIdRef = useRef(1);
  const seedRef = useRef(17);
  const allBetsRef = useRef([]);
  const prevSpinning = useRef(false);
  const seeded = useRef(false);
  const outcomeRef = useRef(lastOutcome);
  const resetTimerRef = useRef(null);
  const settleDelayRef = useRef(null);

  useEffect(() => {
    allBetsRef.current = allBets;
  }, [allBets]);

  useEffect(() => {
    outcomeRef.current = lastOutcome;
  }, [lastOutcome]);

  useEffect(
    () => () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (settleDelayRef.current) clearTimeout(settleDelayRef.current);
    },
    []
  );

  const appendLiveBets = useCallback((count = 1) => {
    setAllBets((prev) => {
      const next = [...prev];
      for (let i = 0; i < count; i += 1) {
        const seed = seedRef.current;
        seedRef.current += 1;
        next.unshift(
          createBetEntry({
            id: `live-${betIdRef.current}`,
            seed,
            amount: randomBetAmount(),
            settled: false,
          })
        );
        betIdRef.current += 1;
      }
      return next.slice(0, 320);
    });
  }, []);

  // Seed All / Previous / Top so every tab has content on first paint
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;

    const live = Array.from({ length: 18 }, (_, idx) => {
      const seed = seedRef.current + idx;
      return createBetEntry({
        id: `seed-${idx}`,
        seed,
        amount: randomBetAmount(),
        settled: false,
      });
    });
    seedRef.current += 18;

    const previousSeed = Array.from({ length: 22 }, (_, idx) => {
      const seed = seedRef.current + idx;
      const amount = randomBetAmount();
      const won = Math.random() < 0.48;
      return createBetEntry({
        id: `prev-${idx}`,
        seed,
        amount,
        settled: true,
        won,
      });
    });
    seedRef.current += 22;

    const historicTop = Array.from({ length: 16 }, (_, idx) => {
      const seed = seedRef.current + idx;
      const amount = randomBetAmount() * (1 + Math.floor(Math.random() * 3));
      return createBetEntry({
        id: `top-${idx}`,
        seed,
        amount,
        settled: true,
        won: true,
      });
    });

    seedRef.current += 16;
    betIdRef.current = 60;

    setAllBets(live);
    setPreviousBets(previousSeed);
    setTopBets(sortTopWins([...historicTop, ...previousSeed]).slice(0, 50));
    setExpectedBets(220 + Math.floor(Math.random() * 80));
    setLoading(false);
  }, []);

  // Grow live bets while round is open (not spinning, not holding settled reveal)
  useEffect(() => {
    if (isSpinning || loading || revealHold) return undefined;

    const tick = () => {
      const burst = Math.random() > 0.7 ? 2 : 1;
      appendLiveBets(burst);
    };

    const id = setInterval(tick, 900 + Math.floor(Math.random() * 700));
    return () => clearInterval(id);
  }, [isSpinning, appendLiveBets, loading, revealHold]);

  useEffect(() => {
    if (roundStats?.bets) {
      const target = Math.max(Number(roundStats.bets), allBetsRef.current.length + 5);
      setExpectedBets(target);
    }
  }, [roundStats?.bets]);

  // Spin start: freeze list only (win stays —). Spin end: settle once outcome can land.
  useEffect(() => {
    if (isSpinning && !prevSpinning.current) {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
      if (settleDelayRef.current) {
        clearTimeout(settleDelayRef.current);
        settleDelayRef.current = null;
      }
      setRevealHold(false);
      setVisibleCount(12);
    }

    if (!isSpinning && prevSpinning.current) {
      // Hold growth; wait briefly so rotating-coin can push lastOutcome
      setRevealHold(true);
      setVisibleCount(12);

      if (settleDelayRef.current) clearTimeout(settleDelayRef.current);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

      settleDelayRef.current = setTimeout(() => {
        settleDelayRef.current = null;
        const settled = settleBets(allBetsRef.current, outcomeRef.current);
        setAllBets(settled);
        setPreviousBets(settled);
        setTopBets((prev) => sortTopWins([...settled, ...prev]).slice(0, 50));

        resetTimerRef.current = setTimeout(() => {
          setAllBets([]);
          setExpectedBets(220 + Math.floor(Math.random() * 80));
          setVisibleCount(12);
          setRevealHold(false);
          appendLiveBets(8);
          resetTimerRef.current = null;
        }, SETTLE_HOLD_MS);
      }, 150);
    }

    prevSpinning.current = isSpinning;
  }, [isSpinning, appendLiveBets]);

  const buildSummary = useCallback((bets, expectedOverride) => {
    const placed = bets.length;
    const expected = expectedOverride ?? Math.max(placed, 1);
    return {
      placed,
      expected,
      totalWin: sumWins(bets.filter((b) => b.settled && Number(b.win) > 0)),
      avatars: bets.slice(0, 5),
    };
  }, []);

  const summaries = useMemo(
    () => ({
      all: {
        placed: allBets.length,
        expected: Math.max(expectedBets, allBets.length),
        // Total win only after settle — open / spinning rounds stay at 0.00
        totalWin: sumWins(allBets.filter((b) => b.settled && Number(b.win) > 0)),
        avatars: allBets.slice(0, 5),
      },
      previous: buildSummary(previousBets, previousBets.length || 1),
      top: buildSummary(topBets, topBets.length || 1),
    }),
    [allBets, previousBets, topBets, expectedBets, buildSummary]
  );

  const getTabBets = useCallback(
    (tab) => {
      if (tab === "previous") return previousBets;
      if (tab === "top") return topBets.length ? topBets : sortTopWins(previousBets);
      return allBets;
    },
    [allBets, previousBets, topBets]
  );

  const viewMore = useCallback(() => {
    setVisibleCount((prev) => prev + 12);
  }, []);

  const resetVisible = useCallback(() => {
    setVisibleCount(12);
  }, []);

  return {
    summaries,
    getTabBets,
    visibleCount,
    viewMore,
    resetVisible,
    loading,
    hasMore: (tab) => getTabBets(tab).length > visibleCount,
  };
};

export default useBetsFeed;
