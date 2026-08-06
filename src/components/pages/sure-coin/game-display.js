import React from "react";
import RotatingCoin from "./rotating-coin";
import TakeBetsTimer from "./take-bets-timer";
import OutcomePanel from "./outcome-panel";
import RoundStatsPanel from "./round-stats-panel";
import { useSureCoinRound } from "../../../context/surecoin-round";

const GameDisplay = ({
  userCoinCount,
  isSpinning,
  userMuted,
  userSoundSet,
  isOnline,
  coinSettled,
  isDocumentVisible,
  roundStats,
  lastOutcome,
  onOutcomeChange,
}) => {
  const { state: roundState } = useSureCoinRound();
  const isWaiting = roundState.phase === "WAITING";

  return (
    <div className="sc-game-display">
      <div className="sc-game-stage">
        <OutcomePanel outcome={lastOutcome} />

        {/* Flex absorber: shrinks/grows with viewport; coin scales inside */}
        <div className="sc-coin-canvas">
          <div className="rotating-images-wrapper coin-sections relative">
            {Array(userCoinCount)
              .fill(1)
              .map((_, idx) => (
                <div className="rotating-image-container" key={`coin-${idx}`}>
                  <RotatingCoin
                    coinnumber={idx + 1}
                    isspinning={isSpinning}
                    usermuted={userMuted}
                    userSoundSet={userSoundSet}
                    coinSettled={coinSettled}
                    onOutcomeChange={onOutcomeChange}
                  />
                </div>
              ))}
          </div>
        </div>

        <RoundStatsPanel startRound={roundStats?.round} roundStats={roundStats} />
      </div>

      <div className="sc-game-footer">
        <div className="sc-director" aria-live="polite">
          <div className="sc-director-title">
            {isWaiting ? "CHOOSE HEADS OR TAILS" : "WAIT FOR NEXT ROUND"}
          </div>
          <div className="sc-director-sub">
            {isWaiting ? "Pick your side and confirm to place your bet" : "\u00A0"}
          </div>
        </div>

        <div className="sc-progress-row">
          {isWaiting && isOnline && isDocumentVisible ? (
            <TakeBetsTimer />
          ) : (
            <div className="bets-timer-empty-holder" aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(GameDisplay);
