import React from "react";
import { formatChoice, formatKes } from "./bets-feed";

const BetsTable = ({
  bets,
  emptyLabel = "No bets yet",
  loading = false,
  loadingLabel = "Loading…",
}) => {
  if (loading && !bets?.length) {
    return <div className="sc-bets-empty sc-bets-loading">{loadingLabel}</div>;
  }

  if (!bets?.length) {
    return <div className="sc-bets-empty">{emptyLabel}</div>;
  }

  return (
    <div className="sc-bets-table-wrap">
      <table className="sc-bets-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Bet KES</th>
            <th>X</th>
            <th>Win KES</th>
          </tr>
        </thead>
        <tbody>
          {bets.map((bet) => {
            const showWin = Boolean(
              bet.settled && bet.won && Number(bet.win) > 0
            );
            return (
              <tr key={bet.id} className={showWin ? "is-win" : ""}>
                <td>
                  <div className="sc-player-cell">
                    <span
                      className="sc-avatar sc-avatar-sm"
                      style={{ background: bet.avatarColor }}
                    >
                      {(bet.rawName || bet.player || "P")[0]?.toUpperCase()}
                    </span>
                    <span>{bet.player}</span>
                  </div>
                </td>
                <td>{formatKes(bet.bet)}</td>
                <td>
                  <span
                    className={`sc-bet-choice ${
                      bet.choice === "heads"
                        ? "is-heads"
                        : bet.choice === "tails"
                          ? "is-tails"
                          : ""
                    }`}
                  >
                    {formatChoice(bet.choice)}
                  </span>
                </td>
                <td className={showWin ? "sc-win-amount" : ""}>
                  {showWin ? formatKes(bet.win) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(BetsTable);
