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
export const canSelectSide = () => {
  // Side buttons stay selectable after bet:accepted so the hold clears;
  // confirm remains gated by myBet via canConfirmPick.
  return true;
};

/**
 * True when Confirm should be clickable (auth checked separately on click).
 * Pending queue still allows re-confirm to update side/amount.
 * Accepted bets stay non-confirmable until the next round clears myBet.
 */
export const canConfirmPick = ({ hasPick, phase, myBet }) => {
  if (!hasPick) return false;
  if (myBet) return false;
  return true;
};

/** Place now vs queue for the next WAITING window. */
export const shouldQueueForNextRound = ({ canPlaceBet, isOnline, isDocumentVisible }) => {
  if (!isOnline || !isDocumentVisible) return true;
  return !canPlaceBet;
};
