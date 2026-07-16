import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '../../features/auth/store';
import { authApi } from '../../features/auth/api';
import { ClockIcon, LogoutIcon } from '../ui/icons';

/** Idle time before the warning appears. */
const IDLE_MS = 5 * 60_000;
/** Grace period to click "I'm here" before the session ends. */
const WARN_SECONDS = 20;

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'mousemove', 'wheel', 'scroll', 'touchstart'] as const;

type Phase = 'active' | 'warning' | 'expired';

/** Ring that drains in sync with the countdown. */
function CountdownRing({ secondsLeft }: { secondsLeft: number }) {
  const R = 34;
  const C = 2 * Math.PI * R;
  return (
    <span className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
      <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={R} fill="none" strokeWidth="5" className="stroke-amber-100" />
        <circle
          cx="40"
          cy="40"
          r={R}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          className="stroke-amber-500"
          style={{
            strokeDasharray: C,
            strokeDashoffset: C * (1 - secondsLeft / WARN_SECONDS),
            transition: 'stroke-dashoffset 1s linear',
          }}
        />
      </svg>
      <span className="text-2xl font-extrabold tabular-nums text-ink" aria-hidden>
        {secondsLeft}
      </span>
    </span>
  );
}

/**
 * Watches for user inactivity while someone is signed in. After IDLE_MS
 * without input it opens a warning dialog with a WARN_SECONDS countdown;
 * clicking "I'm here" resumes the session, letting it run out (or having
 * been away past the full deadline in a background tab) ends the session.
 */
export default function SessionTimeoutGuard() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('active');
  const [secondsLeft, setSecondsLeft] = useState(WARN_SECONDS);
  const lastActivity = useRef(Date.now());
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const endSession = useCallback(() => {
    setPhase('expired');
    // Best-effort server logout; the local session is cleared regardless.
    authApi.logout().catch(() => {});
    clearAuth();
  }, [clearAuth]);

  useEffect(() => {
    if (!user) return;
    lastActivity.current = Date.now();
    setPhase('active');

    // Once the warning is up, only the "I'm here" button counts — stray
    // mouse noise shouldn't silently extend the session.
    const onActivity = () => {
      if (phaseRef.current === 'active') lastActivity.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    // Deadlines are derived from the activity timestamp rather than chained
    // timeouts, so a throttled background tab still expires on schedule.
    const tick = setInterval(() => {
      if (phaseRef.current === 'expired') return;
      const idleFor = Date.now() - lastActivity.current;
      if (idleFor >= IDLE_MS + WARN_SECONDS * 1000) {
        endSession();
      } else if (idleFor >= IDLE_MS) {
        setPhase('warning');
        setSecondsLeft(Math.ceil((IDLE_MS + WARN_SECONDS * 1000 - idleFor) / 1000));
      }
    }, 500);

    return () => {
      clearInterval(tick);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [user, endSession]);

  const stay = () => {
    lastActivity.current = Date.now();
    setSecondsLeft(WARN_SECONDS);
    setPhase('active');
  };

  const logoutNow = () => {
    authApi.logout().catch(() => {});
    clearAuth();
    setPhase('active');
    navigate('/login');
  };

  const dismissExpired = () => {
    setPhase('active');
    navigate('/login');
  };

  return createPortal(
    <AnimatePresence>
      {phase === 'warning' && (
        <motion.div
          key="warning"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm" aria-hidden />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            role="alertdialog"
            aria-modal="true"
            aria-label="Are you still there?"
            className="relative w-full max-w-sm bg-white rounded-3xl border border-slate-200/60 shadow-lift p-7 sm:p-8 text-center"
          >
            <CountdownRing secondsLeft={secondsLeft} />
            <h2 className="text-xl font-extrabold tracking-tight text-ink">Are you still there?</h2>
            <p className="text-sm font-medium text-ink-soft mt-2" aria-live="polite">
              You've been inactive for a while. For your security we'll sign you out in{' '}
              <span className="font-bold text-ink tabular-nums">{secondsLeft}s</span> unless you let
              us know you're here.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={stay}
                autoFocus
                className="w-full h-11 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.99] transition-all"
              >
                I'm here — keep me signed in
              </button>
              <button
                onClick={logoutNow}
                className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-ink-soft border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <LogoutIcon className="w-4 h-4" />
                Sign out now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {phase === 'expired' && (
        <motion.div
          key="expired"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={dismissExpired} aria-hidden />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            role="alertdialog"
            aria-modal="true"
            aria-label="Session ended"
            className="relative w-full max-w-sm bg-white rounded-3xl border border-slate-200/60 shadow-lift p-7 sm:p-8 text-center"
          >
            <span className="mx-auto mb-5 w-20 h-20 rounded-full ring-8 bg-slate-50 ring-slate-100 flex items-center justify-center">
              <ClockIcon className="w-9 h-9 text-slate-400" />
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-ink">Session ended</h2>
            <p className="text-sm font-medium text-ink-soft mt-2">
              You were signed out after {Math.max(1, Math.round(IDLE_MS / 60_000))} minutes of inactivity to keep your
              account safe. Log back in to pick up where you left off.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={dismissExpired}
                autoFocus
                className="w-full h-11 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.99] transition-all"
              >
                Log back in
              </button>
              <button
                onClick={() => {
                  setPhase('active');
                  navigate('/');
                }}
                className="w-full h-11 rounded-xl text-sm font-bold text-ink-soft border border-slate-200 hover:border-brand-300 hover:text-brand-700 transition-colors"
              >
                Back to home
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
