import { useEffect, useState } from 'react';
import { ClockIcon } from '../ui/icons';

export default function LockCountdown({
  expiresAt,
  onExpire,
}: {
  expiresAt: number;
  onExpire: () => void;
}) {
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    setRemaining(Math.max(0, expiresAt - Date.now()));
    const interval = setInterval(() => {
      const left = Math.max(0, expiresAt - Date.now());
      setRemaining(left);
      if (left <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const urgent = remaining < 60000;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-bold tabular-nums ${
        urgent ? 'text-red-600' : 'text-brand-800'
      }`}
    >
      <ClockIcon className="w-4 h-4" />
      {minutes}:{String(seconds).padStart(2, '0')}
    </span>
  );
}
