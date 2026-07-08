import { useId } from 'react';

interface IconProps {
  className?: string;
}

export const PlaneIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
  </svg>
);

export const SearchIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className} aria-hidden>
    <path d="m21 21-4.34-4.34M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
  </svg>
);

export const SwapIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4" />
  </svg>
);

export const ClockIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className} aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);

export const TicketIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6Z" />
    <path d="M13 5v2M13 11v2M13 17v2" strokeDasharray="0.1 3.5" />
  </svg>
);

export const ShieldIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const SparkIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M12 2c.4 4.9 2.6 7.6 8 8-5.4.4-7.6 3.1-8 8-.4-4.9-2.6-7.6-8-8 5.4-.4 7.6-3.1 8-8Z" />
  </svg>
);

export const CheckInIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M9 7h6M9 11h6M9 15h3" />
  </svg>
);

/**
 * VertixFlights brand mark: a "V" chevron cut by a rising contrail
 * with a plane at its tip, on a brand-gradient tile.
 */
export const LogoMark = ({ className = 'w-9 h-9' }: IconProps) => {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={`${className} shrink-0 drop-shadow-sm`} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      {/* V chevron */}
      <path
        d="M6.2 8h4.9l4.9 10.4L20.9 8h4.9L16 26.8 6.2 8Z"
        fill="#fff"
        fillOpacity="0.16"
      />
      <path
        d="M6.2 8h4.9l4.9 10.4L20.9 8h4.9L16 26.8 6.2 8Z"
        fill="none"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity="0.9"
      />
      {/* rising contrail */}
      <path
        d="M7 22.5 C 13 19.5, 19 15.5, 25.2 9.8"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeDasharray="0.2 3.4"
      />
      {/* plane at contrail tip */}
      <path d="M28.6 6.2 22.9 8.1l2.5 2.6 3.2-4.5Z" fill="#fff" />
    </svg>
  );
};
