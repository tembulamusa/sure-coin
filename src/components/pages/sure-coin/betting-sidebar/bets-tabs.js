import React from "react";

const TABS = [
  { id: "all", label: "All Bets" },
  { id: "previous", label: "Previous" },
  { id: "top", label: "Top" },
];

const BetsTabs = ({ activeTab, onChange }) => (
  <div className="sc-bets-tabs" role="tablist" aria-label="Betting activity">
    {TABS.map((tab) => {
      const active = activeTab === tab.id;
      return (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`sc-tab-${tab.id}`}
          aria-selected={active}
          aria-controls={`sc-panel-${tab.id}`}
          className={`sc-bets-tab ${active ? "active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);

export default React.memo(BetsTabs);
