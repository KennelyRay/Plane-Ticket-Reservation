import { useEffect, useState } from 'react';

/** Re-renders on an interval so time-derived UI (flight phases, countdowns)
 *  keeps moving without a refresh. */
export function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
