import React from "react";
import BetsSummary from "./bets-summary";
import BetsTable from "./bets-table";

/**
 * Live round feed — grows while betting is open.
 * Win column stays — until the coin outcome lands.
 */
const AllBetsPanel = ({ bets, summary, loading = false }) => (
  <div className="sc-bets-panel" role="tabpanel" aria-label="All Bets">
    <BetsSummary summary={summary} />
    <BetsTable
      bets={bets}
      emptyLabel="Waiting for bets…"
      loading={loading}
      loadingLabel="Loading live bets…"
    />
  </div>
);

export default React.memo(AllBetsPanel);
