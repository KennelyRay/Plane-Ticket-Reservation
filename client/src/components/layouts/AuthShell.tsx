import type { ReactNode } from 'react';
import { LogoMark, PlaneIcon, ShieldIcon, SparkIcon, TicketIcon } from '../ui/icons';

const PERKS = [
  { icon: PlaneIcon, text: 'Real-time schedules on every route' },
  { icon: TicketIcon, text: 'Interactive seat maps with live availability' },
  { icon: ShieldIcon, text: 'Secure checkout and instant e-tickets' },
];

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 max-w-4xl mx-auto mt-4 sm:mt-10 rounded-3xl overflow-hidden shadow-lift border border-slate-200/80 bg-white animate-fade-up">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 bg-brand-950 text-white overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(420px 260px at 0% 0%, rgb(37 99 235 / 0.6), transparent 60%), radial-gradient(420px 300px at 100% 100%, rgb(124 58 237 / 0.55), transparent 60%)',
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <LogoMark className="w-9 h-9" />
          <span className="text-lg font-extrabold tracking-tight">
            Vertix<span className="text-brand-300">Flights</span>
          </span>
        </div>

        <div className="relative">
          <SparkIcon className="w-8 h-8 text-brand-300 mb-4" />
          <p className="text-2xl font-extrabold leading-snug tracking-tight">
            Your next trip starts
            <br />
            with a better booking.
          </p>
          <ul className="mt-8 space-y-4">
            {PERKS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm font-medium text-brand-100/90">
                <span className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] font-medium text-brand-200/70">
          Trusted for domestic & international routes across Asia-Pacific.
        </p>
      </div>

      {/* Form panel */}
      <div className="p-8 sm:p-10">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="text-sm text-ink-soft font-medium mt-1 mb-7">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
