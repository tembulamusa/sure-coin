import React, { useEffect, useRef } from "react";
import { useSureCoinRound } from "../../../context/surecoin-round";

const TakeBetsTimer = () => {
  const { state: roundState } = useSureCoinRound();
  const secondsRemaining = roundState.secondsRemaining ?? 0;
  const waitSeconds =
    roundState.waitSeconds || roundState.config?.roundWaitSeconds || 6;
  const fillRef = useRef(null);
  const deadlineRef = useRef(null);
  const waitMsRef = useRef(Math.max(1, waitSeconds * 1000));
  const displaySecondsRef = useRef(null);

  // Recalibrate end time from socket integer ticks without stair-stepping the bar
  useEffect(() => {
    const waitMs = Math.max(1, waitSeconds * 1000);
    waitMsRef.current = waitMs;
    const expectedEnd = Date.now() + Math.max(0, secondsRemaining) * 1000;
    const prev = deadlineRef.current;
    if (prev == null || Math.abs(prev - expectedEnd) > 1200) {
      deadlineRef.current = expectedEnd;
    } else {
      // Soft sync so 1s ticks nudge the clock instead of jumping the fill
      deadlineRef.current = prev * 0.65 + expectedEnd * 0.35;
    }
  }, [
    secondsRemaining,
    waitSeconds,
    roundState.roundId,
    roundState.phase,
  ]);

  useEffect(() => {
    if (roundState.phase !== "WAITING") {
      deadlineRef.current = null;
      if (fillRef.current) {
        fillRef.current.style.transform = "scaleX(0)";
      }
      return undefined;
    }

    let rafId = 0;
    const paint = () => {
      const waitMs = waitMsRef.current || 1;
      const remainingMs = Math.max(0, (deadlineRef.current ?? 0) - Date.now());
      const progress = Math.max(0, Math.min(1, remainingMs / waitMs));
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${progress})`;
      }
      if (displaySecondsRef.current) {
        displaySecondsRef.current.textContent = String(
          Math.max(0, Math.ceil(remainingMs / 1000))
        );
      }
      rafId = requestAnimationFrame(paint);
    };
    rafId = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(rafId);
  }, [roundState.phase, roundState.roundId]);

  return (
    <div className="sc-countdown">
      <div className="time-left">
        <span className="text">STARTS IN </span>
        <span className="counter" ref={displaySecondsRef}>
          {secondsRemaining}
        </span>
      </div>
      <div className="sc-countdown-track">
        <div
          ref={fillRef}
          className="sc-countdown-fill"
          style={{ transform: "scaleX(1)" }}
        />
      </div>
    </div>
  );
};

export default React.memo(TakeBetsTimer);
