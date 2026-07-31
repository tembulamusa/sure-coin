import React from "react";
import BetsSummary from "./bets-summary";
import BetsTable from "./bets-table";

/**
 * Biggest wins across recent rounds (Aviator "Top").
 */
const TopBetsPanel = ({ bets, summary, loading = false }) => (
  <div className="sc-bets-panel" role="tabpanel" aria-label="Top">
    <BetsSummary summary={summary} />
    <BetsTable
      bets={bets}
      emptyLabel="No top wins yet"
      loading={loading}
      loadingLabel="Loading top wins…"
    />
  </div>
);

export default React.memo(TopBetsPanel);
