import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';

/** The current time, updated every intervalMs (for countdowns). */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => DateTime.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(DateTime.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
