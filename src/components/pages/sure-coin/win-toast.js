import React, { useEffect, useState } from "react";

const DISMISS_MS = 3500;

/**
 * Aviator-style win toast — top-center green pill, slides in, holds, slides out.
 * Visual only; mute must never gate this component.
 */
const WinToast = ({ win, payout, visible, onDismiss }) => {
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!visible || !win) {
      setMounted(false);
      setLeaving(false);
      return undefined;
    }

    setMounted(true);
    setLeaving(false);

    const leaveTimer = setTimeout(() => setLeaving(true), DISMISS_MS - 320);
    const dismissTimer = setTimeout(() => {
      setMounted(false);
      setLeaving(false);
      if (typeof onDismiss === "function") onDismiss();
    }, DISMISS_MS);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(dismissTimer);
    };
  }, [visible, win, payout, onDismiss]);

  if (!mounted || !win) return null;

  const amount = Number(payout);
  const amountLabel =
    Number.isFinite(amount) && amount > 0
      ? `KES ${amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : null;

  return (
    <div
      className={`sc-win-toast${leaving ? " is-leaving" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="sc-win-toast-inner">
        <span className="sc-win-toast-label">You won</span>
        {amountLabel && (
          <span className="sc-win-toast-amount">{amountLabel}</span>
        )}
      </div>
    </div>
  );
};

export default React.memo(WinToast);
