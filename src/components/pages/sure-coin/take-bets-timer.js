import React, { useMemo } from "react";
import { useSureCoinRound } from "../../../context/surecoin-round";

const TakeBetsTimer = () => {
  const { state: roundState } = useSureCoinRound();
  const secondsRemaining = roundState.secondsRemaining ?? 0;
  const waitSeconds = roundState.waitSeconds || roundState.config?.roundWaitSeconds || 6;

  const progress = useMemo(() => {
    if (waitSeconds <= 0) return 0;
    return Math.max(0, Math.min(1, secondsRemaining / waitSeconds));
  }, [secondsRemaining, waitSeconds]);

  return (
    <div className="sc-countdown">
      <div className="time-left">
        <span className="text">STARTS IN </span>
        <span className="counter">{secondsRemaining}</span>
      </div>
      <div className="sc-countdown-track">
        <div
          className="sc-countdown-fill"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
};

export default React.memo(TakeBetsTimer);
