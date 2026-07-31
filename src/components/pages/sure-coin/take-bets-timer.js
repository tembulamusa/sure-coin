import React, { useEffect, useRef, useState } from "react";

const TakeBetsTimer = (props) => {
    const { setRunCoinSpin, setRoundStats, setPrepToStart, setCoinSettled } = props;
    const [timeLeft, setTimeLeft] = useState(650);
    const [roundBets, setRoundBets] = useState(0);
    const startedRef = useRef(false);

    const timeroundRangeMapper = {
      0: { min: 1126, max: 2200 },
      1: { min: 1700, max: 2300 },
      2: { min: 3500, max: 6050 },
      3: { min: 6500, max: 10000 },
      4: { min: 9990, max: 22000 },
      5: { min: 18000, max: 28000 },
      6: { min: 27000, max: 45000 },
    };

    const randomInc = (prev, min, max) =>
      prev + Math.floor(Math.random() * (max - min) + min);

    useEffect(() => {
      if (startedRef.current) return undefined;
      startedRef.current = true;
      setCoinSettled(true);

      const intervalId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalId);
            setRunCoinSpin(true);
            return 0;
          }
          return prev - 1;
        });
      }, 10);

      return () => clearInterval(intervalId);
    }, [setRunCoinSpin, setCoinSettled]);

    useEffect(() => {
      if (timeLeft <= 400 && timeLeft > 0) {
        setPrepToStart(true);
        setCoinSettled(false);
      } else if (timeLeft > 400) {
        setPrepToStart(false);
      }
    }, [timeLeft, setPrepToStart, setCoinSettled]);

    const rangeMapperFnct = (hour) => {
      const time = parseInt(hour, 10);
      let rangeMapper = 0;
      if (time <= 4) rangeMapper = 0;
      else if (time <= 8) rangeMapper = 1;
      else if (time <= 10) rangeMapper = 4;
      else if (time <= 13) rangeMapper = 2;
      else if (time <= 16) rangeMapper = 3;
      else if (time <= 22) rangeMapper = 6;
      else if (time <= 23) rangeMapper = 5;
      return timeroundRangeMapper[rangeMapper];
    };

    useEffect(() => {
      const getMappedRange = rangeMapperFnct(new Date().getHours());
      setRoundBets(randomInc(0, getMappedRange?.min || 1000, getMappedRange?.max || 2000));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    useEffect(() => {
      if (roundBets > 0) {
        const heads = randomInc(0, 35, 65);
        const delay = randomInc(0, 100, 1000);
        const timeoutId = setTimeout(() => {
          setRoundBets((prev) => prev + randomInc(0, 1, 100));
        }, delay);
        setRoundStats({
          bets: roundBets,
          heads,
          tails: 100 - heads,
        });
        return () => clearTimeout(timeoutId);
      }
      return undefined;
    }, [roundBets, setRoundStats]);
  
    const progress = (0 + timeLeft) / 650;
    return (
      <div className="sc-countdown">
        <div className="time-left">
          <span className="text">STARTS IN </span>
          <span className="counter">{parseInt(timeLeft / 100)}</span>
        </div>
        <div className="sc-countdown-track">
          <div className="sc-countdown-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    );
  };

  export default React.memo(TakeBetsTimer);