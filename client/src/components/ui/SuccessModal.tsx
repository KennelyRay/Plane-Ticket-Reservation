import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Tone = 'success' | 'brand';

const TONES: Record<Tone, { halo: string; icon: string }> = {
  success: { halo: 'bg-emerald-50 ring-emerald-100', icon: 'text-emerald-500' },
  brand: { halo: 'bg-brand-50 ring-brand-100', icon: 'text-brand-600' },
};

function AnimatedCheck({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" className={`w-14 h-14 ${className}`} aria-hidden>
      <circle
        cx="28"
        cy="28"
        r="25"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="modal-check-circle"
      />
      <path
        d="M17.5 29.5l7 7 14-15"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="modal-check-mark"
      />
    </svg>
  );
}

/**
 * Centered confirmation dialog with a self-drawing check mark.
 * Closes on Escape or backdrop click; actions are passed as children
 * and stack at the bottom of the card.
 */
export default function SuccessModal({
  open,
  onClose,
  title,
  message,
  tone = 'success',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message?: ReactNode;
  tone?: Tone;
  children?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const t = TONES[tone];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/45 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-sm bg-white rounded-3xl border border-slate-200/60 shadow-lift p-7 sm:p-8 text-center animate-pop-in"
      >
        <span
          className={`mx-auto mb-5 w-20 h-20 rounded-full ring-8 flex items-center justify-center ${t.halo}`}
        >
          <AnimatedCheck className={t.icon} />
        </span>
        <h2 className="text-xl font-extrabold tracking-tight text-ink">{title}</h2>
        {message && <div className="text-sm font-medium text-ink-soft mt-2">{message}</div>}
        {children && <div className="mt-6 flex flex-col gap-2.5">{children}</div>}
      </div>
    </div>,
    document.body
  );
}
