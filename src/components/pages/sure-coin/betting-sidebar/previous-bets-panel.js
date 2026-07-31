import React from "react";
import BetsSummary from "./bets-summary";
import BetsTable from "./bets-table";

/**
 * Last completed round results (Aviator "Previous").
 */
const PreviousBetsPanel = ({ bets, summary, loading = false }) => (
  <div className="sc-bets-panel" role="tabpanel" aria-label="Previous">
    <BetsSummary summary={summary} />
    <BetsTable
      bets={bets}
      emptyLabel="No previous round bets"
      loading={loading}
      loadingLabel="Loading previous round…"
    />
  </div>
);

export default React.memo(PreviousBetsPanel);
