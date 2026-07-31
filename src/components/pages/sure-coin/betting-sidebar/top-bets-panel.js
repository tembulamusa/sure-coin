import React, { useMemo, useState } from "react";
import BetsSummary from "./bets-summary";
import BetsTable from "./bets-table";
import TopBetsFilters from "./top-bets-filters";
import { sumWins } from "./bets-feed";

const MS_DAY = 24 * 60 * 60 * 1000;
const PERIOD_MS = {
  day: MS_DAY,
  month: 30 * MS_DAY,
  year: 365 * MS_DAY,
};

const filterByPeriod = (bets, period) => {
  const windowMs = PERIOD_MS[period] || PERIOD_MS.day;
  const cutoff = Date.now() - windowMs;
  return bets.filter((bet) => (Number(bet.at) || 0) >= cutoff);
};

const sortByMetric = (bets, metric) => {
  const list = [...bets];
  if (metric === "x") {
    return list.sort(
      (a, b) => (Number(b.multiplier) || 0) - (Number(a.multiplier) || 0)
    );
  }
  if (metric === "rounds") {
    return list.sort(
      (a, b) => (Number(b.rounds) || 0) - (Number(a.rounds) || 0)
    );
  }
  // win
  return list.sort((a, b) => (Number(b.win) || 0) - (Number(a.win) || 0));
};

/**
 * Biggest wins across recent rounds (Aviator "Top").
 * Period (Day / Month / Year) scopes the list; metric re-ranks it.
 */
const TopBetsPanel = ({ bets, summary, loading = false }) => {
  const [period, setPeriod] = useState("day");
  const [metric, setMetric] = useState("x");

  const rows = useMemo(() => {
    const scoped = filterByPeriod(bets, period);
    return sortByMetric(scoped, metric);
  }, [bets, metric, period]);

  const panelSummary = useMemo(
    () => ({
      placed: rows.length,
      expected: Math.max(rows.length, summary?.expected || 1),
      totalWin: sumWins(rows),
      avatars: rows.slice(0, 5),
    }),
    [rows, summary?.expected]
  );

  return (
    <div className="sc-bets-panel" role="tabpanel" aria-label="Top">
      <TopBetsFilters
        period={period}
        metric={metric}
        onPeriodChange={setPeriod}
        onMetricChange={setMetric}
      />
      <BetsSummary summary={panelSummary} />
      <BetsTable
        bets={rows}
        emptyLabel="No top wins yet"
        loading={loading}
        loadingLabel="Loading top wins…"
      />
    </div>
  );
};

export default React.memo(TopBetsPanel);
