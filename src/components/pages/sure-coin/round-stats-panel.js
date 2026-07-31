import React from "react";
import { FiCalendar } from "react-icons/fi";
import { GiTwoCoins } from "react-icons/gi";
import { MdTrendingUp, MdTrendingDown } from "react-icons/md";
import { formatKes } from "./betting-sidebar/bets-feed";

const RoundStatsPanel = ({ startRound, roundStats }) => (
  <div className="sc-stats-panel">
    <div className="sc-stats-row">
      <FiCalendar className="sc-stats-icon" />
      <span className="sc-stats-label">Round</span>
      <span className="sc-stats-value">{startRound}</span>
    </div>
    <div className="sc-stats-row">
      <GiTwoCoins className="sc-stats-icon" />
      <span className="sc-stats-label">Bets</span>
      <span className="sc-stats-value">
        {roundStats?.bets != null ? formatKes(roundStats.bets).replace(/\.00$/, "") : "—"}
      </span>
    </div>
    <div className="sc-stats-row">
      <MdTrendingUp className="sc-stats-icon sc-heads" />
      <span className="sc-stats-label">Heads</span>
      <span className="sc-stats-value">{roundStats?.heads || 0}%</span>
    </div>
    <div className="sc-stats-row">
      <MdTrendingDown className="sc-stats-icon sc-tails" />
      <span className="sc-stats-label">Tails</span>
      <span className="sc-stats-value">{roundStats?.tails || 0}%</span>
    </div>
  </div>
);

export default React.memo(RoundStatsPanel);
