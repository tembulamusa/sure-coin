import React, { useMemo } from "react";
import BetsSummary from "./bets-summary";
import BetsTable from "./bets-table";
import TopBetsFilters from "./top-bets-filters";
import { sumWins } from "./bets-feed";

const TopBetsPanel = ({
  bets,
  summary,
  loading = false,
  period = "day",
  metric = "win",
  onPeriodChange,
  onMetricChange,
}) => {
  const rows = useMemo(() => [...bets], [bets]);

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
        onPeriodChange={onPeriodChange}
        onMetricChange={onMetricChange}
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
