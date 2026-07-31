import React from "react";
import { formatKes } from "./bets-feed";

const BetsSummary = ({ summary }) => {
  const progress = summary.expected
    ? Math.min(100, (summary.placed / summary.expected) * 100)
    : 0;

  return (
    <div className="sc-bets-summary">
      <div className="sc-bets-summary-left">
        <div className="sc-avatar-stack">
          {(summary.avatars?.length ? summary.avatars : [1, 2, 3]).map((item, idx) => (
            <span
              key={item.id || idx}
              className="sc-avatar"
              style={{
                background: item.avatarColor || ["#FFC107", "#4CAF50", "#42A5F5"][idx % 3],
                zIndex: 5 - idx,
              }}
            >
              {(item.rawName || item.player || "P")[0]?.toUpperCase()}
            </span>
          ))}
        </div>
        <div className="sc-bets-progress-block">
          <div className="sc-bets-progress-meta">
            {summary.placed}/{summary.expected} Bets
          </div>
          <div className="sc-bets-progress-track">
            <div className="sc-bets-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="sc-total-win">
        <div className="sc-total-win-value">{formatKes(summary.totalWin)}</div>
        <div className="sc-total-win-label">Total win KES</div>
      </div>
    </div>
  );
};

export default React.memo(BetsSummary);
