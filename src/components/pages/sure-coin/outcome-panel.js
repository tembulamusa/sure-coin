import React from "react";
import HeadsCoin from "../../../assets/surecoin/heads.png";
import TailsCoin from "../../../assets/surecoin/tails.png";

const normalizeSide = (value) => {
  const side = String(value || "").trim().toUpperCase();
  return side === "HEADS" || side === "TAILS" ? side : null;
};

const OutcomePanel = ({ outcome, userPick }) => {
  const side = normalizeSide(outcome);
  const pickSide = normalizeSide(userPick);
  const coinSrc =
    side === "HEADS" ? HeadsCoin : side === "TAILS" ? TailsCoin : null;

  return (
    <div className="sc-outcome-panel" aria-live="polite">
      <div className="sc-outcome-label">OUTCOME</div>
      <div className="sc-outcome-body">
        {coinSrc && <img src={coinSrc} alt="" className="sc-outcome-coin" />}
        <div className="sc-outcome-value">{side || "—"}</div>
      </div>
      {pickSide && (
        <div className="sc-outcome-pick">Your pick: {pickSide}</div>
      )}
    </div>
  );
};

export default React.memo(OutcomePanel);
