import { Link } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store';
import {
  CheckInIcon,
  ClockIcon,
  PlaneIcon,
  SearchIcon,
  ShieldIcon,
  SparkIcon,
  TicketIcon,
} from '../../components/ui/icons';
import heroWing from '../../assets/hero-wing.jpg';

const STATS = [
  { value: '50', label: 'Airports served' },
  { value: '140', label: 'Routes flown' },
  { value: '1,900+', label: 'Flights every 2 weeks' },
];

const FEATURES = [
  {
    icon: TicketIcon,
    title: 'Live seat maps',
    text: 'Pick your exact seat on a real-time cabin map — what you see is what you board with.',
  },
  {
    icon: ClockIcon,
    title: 'Real-time schedules',
    text: 'Fresh departures, fares and availability on every route, updated as you search.',
  },
  {
    icon: ShieldIcon,
    title: 'Secure checkout',
    text: 'Pay with card, GCash or Maya. Your seats stay locked while you complete payment.',
  },
  {
    icon: CheckInIcon,
    title: 'Online check-in',
    text: 'Check in from your phone 24 hours before departure and walk straight to the gate.',
  },
];

const DESTINATIONS = [
  { code: 'CEB', city: 'Cebu', tag: 'Island city break', from: 2500, gradient: 'from-sky-500 to-brand-700' },
  { code: 'TAG', city: 'Bohol', tag: 'Beaches & hills', from: 2500, gradient: 'from-emerald-500 to-teal-700' },
  { code: 'IAO', city: 'Siargao', tag: 'Surf paradise', from: 2500, gradient: 'from-cyan-500 to-sky-700' },
  { code: 'DVO', city: 'Davao', tag: 'Gateway to the south', from: 2500, gradient: 'from-indigo-500 to-brand-800' },
  { code: 'SIN', city: 'Singapore', tag: 'City escape', from: 8500, gradient: 'from-violet-500 to-violet-glow' },
  { code: 'NRT', city: 'Tokyo', tag: 'Culture & lights', from: 8500, gradient: 'from-fuchsia-500 to-violet-700' },
];

const STEPS = [
  {
    icon: SearchIcon,
    title: 'Search & compare',
    text: 'Pick your airports and dates, then sort by departure, price or duration to find your flight.',
  },
  {
    icon: TicketIcon,
    title: 'Choose your seat',
    text: 'Lock in your favorite window or aisle on the live seat map — held for you while you book.',
  },
  {
    icon: SparkIcon,
    title: 'Pay & fly',
    text: 'Checkout in seconds, get an instant e-ticket, and check in online a day before departure.',
  },
];

export default function Landing() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-20 sm:space-y-24">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center pt-4 sm:pt-8">
        <div className="animate-fade-up">
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700 bg-brand-50 border border-brand-100 rounded-full px-3 py-1.5 mb-6">
            <PlaneIcon className="w-3.5 h-3.5 -rotate-45" />
            The Philippines' friendliest way to fly
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight leading-[1.05]">
            Every island.
            <br />
            Every seat.{' '}
            <span className="bg-gradient-to-r from-brand-600 to-violet-glow bg-clip-text text-transparent">
              Your pick.
            </span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] sm:text-base font-medium text-ink-soft leading-relaxed">
            Search live schedules across 50 airports, choose your exact seat on a real-time cabin
            map, and check in from your phone — from Batanes to Bangkok.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/flights"
              className="h-12 px-7 inline-flex items-center gap-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.98] transition-all"
            >
              <SearchIcon className="w-4 h-4" />
              Search flights
            </Link>
            {user ? (
              <Link
                to="/bookings"
                className="h-12 px-7 inline-flex items-center rounded-xl text-sm font-bold text-ink border border-slate-200 bg-white hover:border-brand-300 hover:text-brand-700 transition-colors"
              >
                My bookings
              </Link>
            ) : (
              <Link
                to="/register"
                className="h-12 px-7 inline-flex items-center rounded-xl text-sm font-bold text-ink border border-slate-200 bg-white hover:border-brand-300 hover:text-brand-700 transition-colors"
              >
                Create an account
              </Link>
            )}
          </div>

          <dl className="mt-10 flex items-center gap-8 sm:gap-10">
            {STATS.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums">
                  {s.value}
                </dd>
                <p className="text-[11px] font-semibold text-ink-soft mt-0.5">{s.label}</p>
              </div>
            ))}
          </dl>
        </div>

        {/* Photo + floating UI */}
        <div className="relative animate-fade-up lg:pl-4" style={{ animationDelay: '120ms' }}>
          <div
            className="pointer-events-none absolute -inset-6 rounded-[2.5rem] opacity-60"
            style={{
              background:
                'radial-gradient(340px 240px at 20% 10%, rgb(37 99 235 / 0.18), transparent 65%), radial-gradient(320px 240px at 85% 90%, rgb(124 58 237 / 0.18), transparent 65%)',
            }}
          />
          <img
            src={heroWing}
            alt="Airplane wing above sunset clouds"
            className="relative w-full aspect-[4/3] object-cover rounded-3xl border border-slate-200/60 shadow-lift"
          />

          {/* floating flight card */}
          <div className="absolute -left-3 sm:-left-6 bottom-8 bg-white/95 backdrop-blur rounded-2xl border border-slate-200/80 shadow-lift px-4 py-3 flex items-center gap-3 animate-fade-up" style={{ animationDelay: '320ms' }}>
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-600 to-violet-glow text-white text-[10px] font-extrabold flex items-center justify-center">
              PR
            </span>
            <div className="text-left">
              <p className="text-xs font-bold text-ink tabular-nums">
                MNL 06:30 <span className="text-ink-soft font-semibold">→</span> CEB 07:55
              </p>
              <p className="text-[10px] font-semibold text-emerald-600">Direct · from ₱2,500</p>
            </div>
          </div>

          {/* floating check-in chip */}
          <div className="absolute -right-2 sm:-right-4 top-6 bg-white/95 backdrop-blur rounded-2xl border border-slate-200/80 shadow-lift px-3.5 py-2.5 flex items-center gap-2.5 animate-fade-up" style={{ animationDelay: '440ms' }}>
            <span className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <ShieldIcon className="w-3.5 h-3.5 text-emerald-500" />
            </span>
            <p className="text-[11px] font-bold text-ink leading-tight">
              Checked in
              <span className="block text-[10px] font-semibold text-ink-soft">Seat 12A · Window</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section>
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Booking that feels first class
          </h2>
          <p className="text-sm font-medium text-ink-soft mt-2">
            Everything between "where to next?" and "welcome aboard", handled in one place.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <div
              key={title}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-soft hover:shadow-lift hover:border-brand-200 hover:-translate-y-0.5 transition-all p-6 animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-violet-glow text-white flex items-center justify-center mb-4">
                <Icon className="w-5 h-5" />
              </span>
              <h3 className="font-extrabold tracking-tight">{title}</h3>
              <p className="text-sm font-medium text-ink-soft mt-1.5 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Popular destinations ─────────────────────────────── */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Where will you go next?
            </h2>
            <p className="text-sm font-medium text-ink-soft mt-2">
              Fan favorites from Manila — fares include taxes.
            </p>
          </div>
          <Link
            to="/flights"
            className="text-sm font-bold text-brand-600 hover:underline shrink-0"
          >
            See all routes →
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {DESTINATIONS.map((d, i) => (
            <Link
              key={d.code}
              to={`/flights?origin=MNL&destination=${d.code}&trip=one&sort=departure&page=1`}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${d.gradient} text-white p-5 sm:p-6 min-h-36 sm:min-h-44 flex flex-col justify-between shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all animate-fade-up`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="pointer-events-none absolute -right-4 -top-5 text-[5.5rem] font-extrabold tracking-tighter text-white/10 select-none">
                {d.code}
              </span>
              <PlaneIcon className="w-5 h-5 -rotate-45 text-white/80 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              <div>
                <p className="text-lg sm:text-xl font-extrabold tracking-tight">{d.city}</p>
                <p className="text-[11px] font-semibold text-white/75">{d.tag}</p>
                <p className="text-xs font-bold mt-2 bg-white/15 border border-white/20 rounded-full inline-block px-2.5 py-1">
                  from ₱{d.from.toLocaleString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section>
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Wheels up in three steps
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="relative bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 sm:p-7 animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
              <span className="absolute top-5 right-6 text-4xl font-extrabold text-slate-100 select-none">
                {i + 1}
              </span>
              <span className="w-11 h-11 rounded-xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5" />
              </span>
              <h3 className="font-extrabold tracking-tight">{title}</h3>
              <p className="text-sm font-medium text-ink-soft mt-1.5 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-brand-950 text-white shadow-lift">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(520px 260px at 10% 0%, rgb(37 99 235 / 0.55), transparent 60%), radial-gradient(480px 260px at 95% 100%, rgb(124 58 237 / 0.5), transparent 60%)',
          }}
        />
        <div className="relative px-6 sm:px-12 py-14 sm:py-16 flex flex-col sm:flex-row items-start sm:items-center gap-8">
          <div className="flex-1">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Your window seat is waiting.
            </h2>
            <p className="mt-3 max-w-lg text-[15px] font-medium text-brand-100/90">
              Join thousands of travelers booking smarter — live seats, instant e-tickets and
              mobile check-in on every flight.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              to="/flights"
              className="h-12 px-7 inline-flex items-center gap-2 rounded-xl text-sm font-bold text-brand-900 bg-white shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.98] transition-all"
            >
              <SearchIcon className="w-4 h-4" />
              Find a flight
            </Link>
            {!user && (
              <Link
                to="/register"
                className="h-12 px-7 inline-flex items-center rounded-xl text-sm font-bold text-white border border-white/25 bg-white/10 hover:bg-white/15 transition-colors"
              >
                Sign up free
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
