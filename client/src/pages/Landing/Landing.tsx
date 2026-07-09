import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../features/auth/store';
import { flightApi } from '../../features/flight/api';
import AirportSelect from '../../components/ui/AirportSelect';
import { DESTINATION_IMAGES } from '../../components/flights/destinationImages';
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

const toISODate = (d: Date) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const STATS = [
  { value: '50', label: 'Airports' },
  { value: '140', label: 'Routes' },
  { value: '1,900+', label: 'Flights / 2 weeks' },
];

// Split-flap departures board — a signature airport touch.
const DEPARTURES = [
  { flight: 'PR 101', code: 'CEB', city: 'Cebu', time: '06:00', gate: '12', status: 'Boarding' },
  { flight: 'PR 181', code: 'NRT', city: 'Tokyo', time: '06:00', gate: '07', status: 'On time' },
  { flight: '5J 221', code: 'DVO', city: 'Davao', time: '06:20', gate: '03', status: 'On time' },
  { flight: 'PR 261', code: 'TAG', city: 'Bohol', time: '06:35', gate: '15', status: 'Delayed' },
  { flight: '5J 517', code: 'MPH', city: 'Caticlan', time: '06:50', gate: '09', status: 'On time' },
  { flight: 'PR 431', code: 'SIN', city: 'Singapore', time: '07:10', gate: '21', status: 'On time' },
];

const statusTone: Record<string, string> = {
  'On time': 'text-emerald-300',
  Boarding: 'text-sky-300',
  Delayed: 'text-amber-300',
  Departed: 'text-white/40',
};

const DESTINATIONS = [
  { code: 'CEB', city: 'Cebu', tag: 'Island city break', from: 2500 },
  { code: 'MPH', city: 'Boracay', tag: 'White-sand escape', from: 2500 },
  { code: 'IAO', city: 'Siargao', tag: 'Surf paradise', from: 2500 },
  { code: 'TAG', city: 'Bohol', tag: 'Beaches & hills', from: 2500 },
  { code: 'DRP', city: 'Legazpi', tag: 'Mayon views', from: 2500 },
  { code: 'ENI', city: 'El Nido', tag: 'Hidden lagoons', from: 2650 },
  { code: 'SIN', city: 'Singapore', tag: 'City escape', from: 8500 },
  { code: 'NRT', city: 'Tokyo', tag: 'Culture & lights', from: 8500 },
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

const STEPS = [
  {
    icon: SearchIcon,
    title: 'Search & compare',
    text: 'Pick your airports and dates, then sort by departure, price or duration.',
  },
  {
    icon: TicketIcon,
    title: 'Choose your seat',
    text: 'Lock in your favorite window or aisle on the live map — held while you book.',
  },
  {
    icon: SparkIcon,
    title: 'Pay & fly',
    text: 'Checkout in seconds, get an instant e-ticket, and check in a day before.',
  },
];

function QuickSearch() {
  const { data: airports = [] } = useQuery({
    queryKey: ['airports'],
    queryFn: flightApi.airports,
    staleTime: Infinity,
  });
  const [origin, setOrigin] = useState('MNL');
  const [destination, setDestination] = useState('CEB');
  const [date, setDate] = useState('');

  const params = new URLSearchParams({
    origin,
    destination,
    trip: 'one',
    sort: 'departure',
    page: '1',
  });
  if (date) params.set('date', date);

  const cell = 'relative flex-1 px-4 py-3';

  return (
    <div className="relative z-10 -mt-16 sm:-mt-20 mx-2 sm:mx-8 lg:mx-12 animate-fade-up" style={{ animationDelay: '220ms' }}>
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lift p-1.5 flex flex-col lg:flex-row lg:items-stretch">
        <div className={`${cell} lg:border-r border-b lg:border-b-0 border-slate-100`}>
          <AirportSelect label="From" value={origin} onChange={setOrigin} airports={airports} />
        </div>
        <div className={`${cell} lg:border-r border-b lg:border-b-0 border-slate-100`}>
          <AirportSelect
            label="To"
            value={destination}
            onChange={setDestination}
            airports={airports}
            hintClass="text-violet-glow/80"
            align="left"
          />
        </div>
        <div className={`${cell} border-b lg:border-b-0`}>
          <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft mb-0.5">
            Depart
          </label>
          <input
            type="date"
            value={date}
            min={toISODate(new Date())}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-8 bg-transparent text-xl font-extrabold tracking-tight text-ink focus:outline-none"
          />
          <p className="text-[11px] font-semibold text-ink-soft">{date ? 'One way' : 'Any date'}</p>
        </div>
        <div className="p-1.5 lg:pl-2 flex items-stretch">
          <Link
            to={`/flights?${params.toString()}`}
            className="w-full lg:w-auto px-7 min-h-14 rounded-xl inline-flex items-center justify-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.98] transition-all"
          >
            <SearchIcon className="w-4 h-4" />
            Search flights
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* ── Hero + search ────────────────────────────────────── */}
      <div>
        <section className="relative overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] shadow-lift">
          <img
            src={heroWing}
            alt="Airplane wing above sunset clouds"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/75 to-brand-950/25" />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-950/50 via-transparent to-transparent" />

          <div className="relative px-5 sm:px-10 lg:px-14 pt-12 sm:pt-16 lg:pt-20 pb-24 sm:pb-28">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-100 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 mb-6 animate-fade-in">
              <PlaneIcon className="w-3.5 h-3.5 -rotate-45" />
              The Philippines' friendliest way to fly
            </p>
            <h1 className="max-w-2xl text-white text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.03] animate-fade-up">
              Every island.
              <br />
              Every seat.{' '}
              <span className="bg-gradient-to-r from-brand-300 to-violet-300 bg-clip-text text-transparent">
                Your pick.
              </span>
            </h1>
            <p
              className="mt-5 max-w-lg text-[15px] sm:text-base font-medium text-brand-100/90 leading-relaxed animate-fade-up"
              style={{ animationDelay: '90ms' }}
            >
              Search live schedules across 50 airports, choose your exact seat on a real-time cabin
              map, and check in from your phone — from Batanes to Bangkok.
            </p>

            <dl className="mt-8 flex items-center gap-7 sm:gap-10 animate-fade-up" style={{ animationDelay: '160ms' }}>
              {STATS.map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-white">
                    {s.value}
                  </dd>
                  <p className="text-[11px] font-semibold text-brand-200/80 mt-0.5">{s.label}</p>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <QuickSearch />
      </div>

      {/* ── Departures board ─────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-[#0b1220] text-white shadow-lift border border-white/10">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-8 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-amber-400/15 border border-amber-300/30 flex items-center justify-center">
              <PlaneIcon className="w-4 h-4 -rotate-45 text-amber-300" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/50 font-bold">
                Departures
              </p>
              <p className="font-extrabold tracking-tight">Manila · NAIA Terminal 2</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 text-[11px] font-bold text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live board
          </span>
        </div>

        <div className="hidden sm:grid grid-cols-[110px_1fr_90px_70px_110px] gap-4 px-8 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 border-b border-white/5">
          <span>Flight</span>
          <span>Destination</span>
          <span>Departs</span>
          <span>Gate</span>
          <span className="text-right">Status</span>
        </div>

        <ul className="divide-y divide-white/5">
          {DEPARTURES.map((d) => (
            <li
              key={d.flight}
              className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[110px_1fr_90px_70px_110px] items-center gap-3 sm:gap-4 px-5 sm:px-8 py-3.5 hover:bg-white/[0.03] transition-colors"
            >
              <span className="font-mono font-bold text-amber-300 tabular-nums text-sm">
                {d.flight}
              </span>
              <span className="min-w-0">
                <span className="font-extrabold tracking-tight truncate block">{d.city}</span>
                <span className="text-[11px] font-semibold text-white/45 sm:hidden">
                  {d.code} · {d.time} · Gate {d.gate}
                </span>
                <span className="hidden sm:block text-[11px] font-semibold text-white/45">
                  {d.code}
                </span>
              </span>
              <span className="hidden sm:block font-mono tabular-nums font-bold text-white/90">
                {d.time}
              </span>
              <span className="hidden sm:block font-mono tabular-nums text-white/60">{d.gate}</span>
              <span className={`text-right text-xs font-bold ${statusTone[d.status] ?? 'text-white/60'}`}>
                {d.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Popular destinations (real photos) ───────────────── */}
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
          <Link to="/flights" className="text-sm font-bold text-brand-600 hover:underline shrink-0">
            See all routes →
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {DESTINATIONS.map((d, i) => (
            <Link
              key={d.code}
              to={`/flights?origin=MNL&destination=${d.code}&trip=one&sort=departure&page=1`}
              className="group relative overflow-hidden rounded-2xl min-h-44 sm:min-h-56 flex flex-col justify-end shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all animate-fade-up bg-slate-200"
              style={{ animationDelay: `${i * 55}ms` }}
            >
              <img
                src={DESTINATION_IMAGES[d.code]}
                alt={d.city}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <PlaneIcon className="absolute top-4 right-4 w-4 h-4 -rotate-45 text-white/70 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              <div className="relative p-4">
                <p className="text-lg font-extrabold tracking-tight text-white drop-shadow-sm">
                  {d.city}
                </p>
                <p className="text-[11px] font-semibold text-white/70">{d.tag}</p>
                <p className="mt-2 inline-flex items-center text-[11px] font-bold text-white bg-white/15 border border-white/25 backdrop-blur-sm rounded-full px-2.5 py-1">
                  from ₱{d.from.toLocaleString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Why VertixFlights ────────────────────────────────── */}
      <section>
        <div className="max-w-xl mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Built for the way you fly
          </h2>
          <p className="text-sm font-medium text-ink-soft mt-2">
            Everything between "where to next?" and "welcome aboard", handled in one place.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <div
              key={title}
              className="group bg-white rounded-2xl border border-slate-200/80 shadow-soft hover:shadow-lift hover:border-brand-200 hover:-translate-y-0.5 transition-all p-6 animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="w-11 h-11 rounded-xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center mb-4 group-hover:bg-gradient-to-br group-hover:from-brand-600 group-hover:to-violet-glow group-hover:text-white group-hover:border-transparent transition-colors">
                <Icon className="w-5 h-5" />
              </span>
              <h3 className="font-extrabold tracking-tight">{title}</h3>
              <p className="text-sm font-medium text-ink-soft mt-1.5 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section>
        <div className="max-w-xl mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Wheels up in three steps
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div
              key={title}
              className="relative bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 sm:p-7 animate-fade-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <span className="absolute top-5 right-6 text-4xl font-extrabold text-slate-100 select-none tabular-nums">
                0{i + 1}
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

      {/* ── Closing CTA — boarding pass ──────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-brand-950 text-white shadow-lift">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(520px 260px at 8% 0%, rgb(37 99 235 / 0.55), transparent 60%), radial-gradient(480px 260px at 96% 100%, rgb(124 58 237 / 0.5), transparent 60%)',
          }}
        />
        {/* perforation */}
        <span className="pointer-events-none hidden sm:block absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-dashed border-white/15" />
        <div className="relative px-6 sm:px-12 py-14 sm:py-16 flex flex-col sm:flex-row items-start sm:items-center gap-8">
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-200/80 mb-3">
              Boarding pass · ready when you are
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Your window seat is waiting.
            </h2>
            <p className="mt-3 max-w-lg text-[15px] font-medium text-brand-100/90">
              Live seats, instant e-tickets and mobile check-in on every flight — from the first
              search to boarding.
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
