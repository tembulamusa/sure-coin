import React from "react";
import RotatingCoin from "./rotating-coin";
import TakeBetsTimer from "./take-bets-timer";
import OutcomePanel from "./outcome-panel";
import RoundStatsPanel from "./round-stats-panel";

const GameDisplay = ({
  userCoinCount,
  runCoinSpin,
  userMuted,
  nextSession,
  prevSession,
  userSoundSet,
  isOnline,
  setPrepToStart,
  prepToStart,
  coinSettled,
  isDocumentVisible,
  elizabeth,
  setRunCoinSPin,
  roundStats,
  setCoinSettled,
  setRoundStats,
  startRound,
  lastOutcome,
  onOutcomeChange,
}) => (
  <div className="sc-game-display">
    <div className="sc-game-stage">
      <OutcomePanel outcome={lastOutcome} />

      <div className="rotating-images-wrapper coin-sections relative">
        {Array(userCoinCount)
          .fill(1)
          .map((_, idx) => (
            <div className="rotating-image-container" key={`coin-${idx}`}>
              <RotatingCoin
                coinnumber={idx + 1}
                isspinning={runCoinSpin}
                usermuted={userMuted}
                nxtSession={nextSession}
                prevSession={prevSession}
                userSoundSet={userSoundSet}
                isOnline={isOnline}
                setPrepToStart={setPrepToStart}
                prepToStart={prepToStart}
                coinSettled={coinSettled}
                isDocumentVisible={isDocumentVisible}
                cvterfxn={elizabeth}
                onOutcomeChange={onOutcomeChange}
              />
            </div>
          ))}
      </div>

      <RoundStatsPanel startRound={startRound} roundStats={roundStats} />
    </div>

    <div className="sc-game-footer">
      <div className="sc-director" aria-live="polite">
        <div className="sc-director-title">
          {!runCoinSpin ? "CHOOSE HEADS OR TAILS" : "WAIT FOR NEXT ROUND"}
        </div>
        <div className="sc-director-sub">
          {!runCoinSpin
            ? "Pick your side and confirm to place your bet"
            : "\u00A0"}
        </div>
      </div>

      {!runCoinSpin && isOnline && isDocumentVisible ? (
        <TakeBetsTimer
          setRunCoinSpin={setRunCoinSPin}
          roundStats={roundStats}
          setPrepToStart={setPrepToStart}
          prepToStart={prepToStart}
          setCoinSettled={setCoinSettled}
          setRoundStats={setRoundStats}
        />
      ) : (
        <div className="bets-timer-empty-holder" aria-hidden="true" />
      )}
    </div>
  </div>
);

export default React.memo(GameDisplay);
