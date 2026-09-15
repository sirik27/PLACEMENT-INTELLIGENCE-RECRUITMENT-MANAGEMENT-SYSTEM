import { useState, useEffect, useRef } from 'react';

/**
 * Robust countdown timer hook.
 * Ticks down continuously every 1 second anchored to the initial mount timestamp.
 */
export function useServerTimer({ durationMinutes = 60, startTime, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, (parseInt(durationMinutes, 10) || 60) * 60));
  const [isExpired, setIsExpired] = useState(false);
  
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Capture start time ONCE when timer mounts
  const startTimestampRef = useRef(null);

  useEffect(() => {
    if (!startTimestampRef.current) {
      if (startTime?.toDate) {
        startTimestampRef.current = startTime.toDate().getTime();
      } else if (startTime) {
        startTimestampRef.current = new Date(startTime).getTime();
      } else {
        startTimestampRef.current = Date.now();
      }
    }

    const totalSecs = (parseInt(durationMinutes, 10) || 60) * 60;
    
    // Calculate initial remaining seconds
    const elapsedSecs = Math.floor((Date.now() - startTimestampRef.current) / 1000);
    const initialRem = Math.max(0, totalSecs - elapsedSecs);
    setTimeLeft(initialRem);

    if (initialRem <= 0) {
      setIsExpired(true);
      onExpireRef.current?.();
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerId);
          setIsExpired(true);
          onExpireRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [durationMinutes]);

  const pad = (n) => String(n).padStart(2, '0');
  const h = Math.floor(timeLeft / 3600);
  const m = Math.floor((timeLeft % 3600) / 60);
  const s = timeLeft % 60;

  return {
    timeLeft,
    isExpired,
    formatted: {
      hours: h,
      minutes: m,
      seconds: s,
      display: `${pad(h)}:${pad(m)}:${pad(s)}`,
      percentage: durationMinutes > 0 ? (((durationMinutes * 60 - timeLeft) / (durationMinutes * 60)) * 100) : 0,
    },
  };
}
