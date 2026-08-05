import React, { useMemo, useState } from "react";
import { MdKeyboardArrowDown } from "react-icons/md";
import BetsTabs from "./bets-tabs";
import AllBetsPanel from "./all-bets-panel";
import PreviousBetsPanel from "./previous-bets-panel";
import TopBetsPanel from "./top-bets-panel";
import useBetsFeed from "./use-bets-feed";

const BettingSidebar = ({ isSpinning, roundStats, lastOutcome }) => {
  const [activeTab, setActiveTab] = useState("all");
  const {
    summaries,
    getTabBets,
    visibleCount,
    viewMore,
    resetVisible,
    hasMore,
    loading,
    applyTopFilters,
    topPeriod,
    topMetric,
  } = useBetsFeed({
    isSpinning,
    roundStats,
    lastOutcome,
  });

  const rows = useMemo(
    () => getTabBets(activeTab).slice(0, visibleCount),
    [activeTab, getTabBets, visibleCount]
  );

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    resetVisible();
  };

  return (
    <div className="sc-betting-sidebar-shell">
      <aside className="sc-betting-sidebar">
        <BetsTabs activeTab={activeTab} onChange={handleTabChange} />

        <div id={`sc-panel-${activeTab}`} className="sc-bets-panel-host">
          {activeTab === "all" && (
            <AllBetsPanel bets={rows} summary={summaries.all} loading={loading} />
          )}
          {activeTab === "previous" && (
            <PreviousBetsPanel
              bets={rows}
              summary={summaries.previous}
              loading={loading}
            />
          )}
          {activeTab === "top" && (
            <TopBetsPanel
              bets={rows}
              summary={summaries.top}
              loading={loading}
              period={topPeriod}
              metric={topMetric}
              onPeriodChange={(p) => applyTopFilters(p, topMetric)}
              onMetricChange={(m) => applyTopFilters(topPeriod, m)}
            />
          )}
        </div>

        {hasMore(activeTab) && (
          <button type="button" className="sc-view-more" onClick={viewMore}>
            View More <MdKeyboardArrowDown />
          </button>
        )}
      </aside>
    </div>
  );
};

export default React.memo(BettingSidebar);
