import React from "react";
import HeadsCoin from "../../../assets/surecoin/heads.png";
import TailsCoin from "../../../assets/surecoin/tails.png";

const OutcomePanel = ({ outcome }) => {
  const normalized = String(outcome || "").trim().toUpperCase();
  const side = normalized === "HEADS" || normalized === "TAILS" ? normalized : null;
  const coinSrc =
    side === "HEADS" ? HeadsCoin : side === "TAILS" ? TailsCoin : null;

  return (
    <div className="sc-outcome-panel" aria-live="polite">
      <div className="sc-outcome-label">OUTCOME</div>
      <div className="sc-outcome-body">
        {coinSrc && <img src={coinSrc} alt="" className="sc-outcome-coin" />}
        <div className="sc-outcome-value">{side || "—"}</div>
      </div>
    </div>
  );
};

export default React.memo(OutcomePanel);
