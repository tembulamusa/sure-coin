/**
 * Next-round pending bet helpers for Surecoin stake panel.
 * While FLIPPING / RESULT (or otherwise closed for the current wait window),
 * a confirmed pick is queued and flushed once WAITING / canPlaceBet opens.
 */

export const createPendingBet = (pick, amount) => {
  if (!pick) return null;
  return {
    pick: String(pick).toLowerCase(),
    amount: Number(amount) || 0,
    queuedAt: Date.now(),
  };
};

/** True when the user may change HEADS/TAILS for UI purposes. */
export const canSelectSide = ({ phase, myBet }) => {
  // Locked only after a bet is accepted for the current WAITING window.
  if (phase === "WAITING" && myBet) return false;
  return true;
};

/**
 * True when Confirm should be clickable (auth checked separately on click).
 * Pending queue still allows re-confirm to update side/amount.
 */
export const canConfirmPick = ({ hasPick, phase, myBet }) => {
  if (!hasPick) return false;
  if (phase === "WAITING" && myBet) return false;
  return true;
};

/** Place now vs queue for the next WAITING window. */
export const shouldQueueForNextRound = ({ canPlaceBet, isOnline, isDocumentVisible }) => {
  if (!isOnline || !isDocumentVisible) return true;
  return !canPlaceBet;
};
