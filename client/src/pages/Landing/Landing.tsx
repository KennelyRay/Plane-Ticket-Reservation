import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../features/auth/store';
import { flightApi } from '../../features/flight/api';
import { useNow } from '../../hooks/useNow';
import type { Airport, Flight } from '../../types';
import { DESTINATION_IMAGES } from '../../components/flights/destinationImages';
import {
  CheckIcon,
  CheckInIcon,
  ChevronDownIcon,
  ClockIcon,
  PlaneIcon,
  SearchIcon,
  ShieldIcon,
  SparkIcon,
  TicketIcon,
} from '../../components/ui/icons';

const STATS = [
  { value: '50', label: 'Airports' },
  { value: '140', label: 'Routes' },
  { value: '1,900+', label: 'Flights / 2 weeks' },
];

// Hero carousel — one full-bleed photo per destination, auto-advancing.
// Wikimedia thumbs re-requested at 1280px (the largest bucket every hero
// image supports; bigger sizes 400 when they exceed the original).
const HERO_SLIDES = [
  { code: 'MPH', city: 'Boracay', tag: 'World-famous white sand', from: 2500 },
  { code: 'ENI', city: 'El Nido', tag: 'Hidden lagoons of Palawan', from: 2650 },
  { code: 'NRT', city: 'Tokyo', tag: 'Neon nights & cherry blossoms', from: 8500 },
  { code: 'TAG', city: 'Bohol', tag: 'Chocolate Hills & beaches', from: 2500 },
  { code: 'SIN', city: 'Singapore', tag: 'The garden city escape', from: 8500 },
  { code: 'HKG', city: 'Hong Kong', tag: 'Skyline by the harbour', from: 7800 },
].map((s) => ({ ...s, image: DESTINATION_IMAGES[s.code].replace('/500px-', '/1280px-') }));

const SLIDE_MS = 5000;

const statusTone: Record<string, string> = {
  'On time': 'text-emerald-300',
  Boarding: 'text-sky-300',
  Delayed: 'text-amber-300',
  Departed: 'text-white/40',
};

const formatBoardTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

// "PR101" → "PR 101" for the split-flap look
const formatFlightNo = (n: string) => `${n.slice(0, 2)} ${n.slice(2)}`;

/** Board status derived from the flight's own status and clock. */
const boardStatus = (f: Flight, now: number) => {
  if (f.status === 'DELAYED') return 'Delayed';
  if (new Date(f.departureTime).getTime() <= now) return 'Departed';
  if (f.boardingTime && new Date(f.boardingTime).getTime() <= now) return 'Boarding';
  return 'On time';
};

/**
 * Airport picker styled for the dark departures board: the trigger reads as
 * the board's title, the panel is a searchable dark list.
 */
function BoardAirportPicker({
  airports,
  value,
  onChange,
}: {
  airports: Airport[];
  value: string;
  onChange: (iataCode: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = airports.find((a) => a.iataCode === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      inputRef.current?.focus();
    }
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? airports.filter(
        (a) =>
          a.iataCode.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.country.toLowerCase().includes(q)
      )
    : airports;

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Choose departure airport"
        className="group inline-flex items-center gap-1.5 font-extrabold tracking-tight text-white rounded-lg -mx-1 px-1 hover:text-brand-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 transition-colors"
      >
        {selected ? `${selected.city} · ${selected.iataCode}` : value}
        <ChevronDownIcon
          className={`w-3.5 h-3.5 text-white/50 group-hover:text-brand-200 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <p className="text-[11px] font-semibold text-white/45 truncate max-w-56">
        {selected?.name ?? '—'}
      </p>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-30 w-80 max-w-[80vw] rounded-2xl bg-[#111d33] border border-white/10 shadow-lift animate-fade-in">
          <div className="p-2 border-b border-white/10">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city, code or airport"
              aria-label="Search airports"
              className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold text-white placeholder:text-white/30 focus:outline-none focus:border-brand-400/60 focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          <ul className="max-h-72 overflow-auto py-1.5">
            {filtered.length === 0 && (
              <li className="px-4 py-6 text-center text-xs font-semibold text-white/40">
                No matching airports
              </li>
            )}
            {filtered.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(a.iataCode);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-2 flex items-center gap-2.5 text-left transition-colors hover:bg-white/[0.06] ${
                    a.iataCode === value ? 'bg-white/[0.08]' : ''
                  }`}
                >
                  <span className="w-11 py-1 rounded-lg bg-white/10 text-center text-[11px] font-extrabold text-amber-300 shrink-0">
                    {a.iataCode}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-white truncate">{a.city}</span>
                    <span className="block text-[11px] font-medium text-white/40 truncate">
                      {a.name}
                    </span>
                  </span>
                  {a.iataCode === value && (
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// First entry is the featured (large) bento tile.
const DESTINATIONS = [
  { code: 'MPH', city: 'Boracay', tag: 'World-famous white sand', from: 2500 },
  { code: 'CEB', city: 'Cebu', tag: 'Island city break', from: 2500 },
  { code: 'IAO', city: 'Siargao', tag: 'Surf paradise', from: 2500 },
  { code: 'TAG', city: 'Bohol', tag: 'Beaches & hills', from: 2500 },
  { code: 'ENI', city: 'El Nido', tag: 'Hidden lagoons', from: 2650 },
  { code: 'DRP', city: 'Legazpi', tag: 'Mayon views', from: 2500 },
  { code: 'USU', city: 'Coron', tag: 'Dive & lagoons', from: 2650 },
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
    text: 'Card, GCash or Maya — your seats stay locked while you complete payment.',
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

export default function Landing() {
  const user = useAuthStore((s) => s.user);

  // Hero destination carousel; the timer resets whenever the slide changes
  // so a manual dot click gets a full interval before auto-advancing.
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), SLIDE_MS);
    return () => clearInterval(id);
  }, [slide]);

  const active = HERO_SLIDES[slide];

  // Live departures board: any airport can be picked as the origin, refetched
  // every 30s, statuses re-derived every 30s in between so Boarding/Departed
  // roll over on time.
  const now = useNow(30_000);
  const [boardOrigin, setBoardOrigin] = useState('MNL');
  const { data: airports = [] } = useQuery({
    queryKey: ['airports'],
    queryFn: flightApi.airports,
    staleTime: Infinity,
  });
  // Only airports with active operations belong on a live departures board
  const boardAirports = useMemo(
    () =>
      airports
        .filter((a) => a.isActive)
        .sort((a, b) => a.city.localeCompare(b.city)),
    [airports]
  );
  const { data: departuresData, isPlaceholderData: boardSwitching } = useQuery({
    queryKey: ['landing-departures', boardOrigin],
    queryFn: () =>
      flightApi.search({ origin: boardOrigin, sort: 'departure', page: 1, pageSize: 6 }),
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  });
  const departures = departuresData?.flights ?? [];
  const boardAirport = airports.find((a) => a.iataCode === boardOrigin);

  return (
    <div className="space-y-14 sm:space-y-20">
      {/* ── Hero — rotating destination showcase ─────────────── */}
      {/* Full-bleed: breaks out of the page container to span the viewport,
          and -mt-8 pulls it flush under the sticky header */}
      <section className="relative overflow-hidden w-screen left-1/2 -translate-x-1/2 -mt-8 min-h-[520px] sm:min-h-[600px] lg:min-h-[660px] flex flex-col">
        {HERO_SLIDES.map((s, i) => (
          <img
            key={s.code}
            src={s.image}
            alt={s.city}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-[1400ms] ease-out ${
              i === slide ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/90 via-brand-950/25 to-brand-950/45" />

        <div className="relative flex-1 flex flex-col items-center justify-center text-center px-5 py-16 sm:py-20">
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 mb-6 animate-fade-in">
            <PlaneIcon className="w-3.5 h-3.5 -rotate-45" />
            The Philippines' friendliest way to fly
          </p>

          {/* Big letter-spaced destination name, re-animated on each slide */}
          <h1
            key={active.code}
            className="text-white text-5xl sm:text-7xl lg:text-8xl font-extrabold uppercase tracking-[0.18em] sm:tracking-[0.28em] leading-none drop-shadow-lg animate-fade-up [text-indent:0.18em] sm:[text-indent:0.28em]"
          >
            {active.city}
          </h1>
          <p
            key={`${active.code}-tag`}
            className="mt-4 text-sm sm:text-base font-semibold text-white/85 animate-fade-up"
            style={{ animationDelay: '80ms' }}
          >
            {active.tag} · Manila → {active.code} from ₱{active.from.toLocaleString()}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={`/flights?origin=MNL&destination=${active.code}&trip=one&sort=departure&page=1`}
              className="h-12 px-7 inline-flex items-center gap-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.98] transition-all"
            >
              <SearchIcon className="w-4 h-4" />
              Fly to {active.city}
            </Link>
            {user ? (
              <Link
                to={user.role === 'ADMIN' ? '/admin' : '/bookings'}
                className="h-12 px-7 inline-flex items-center rounded-xl text-sm font-bold text-white border border-white/25 bg-white/10 backdrop-blur-sm hover:bg-white/15 transition-colors"
              >
                {user.role === 'ADMIN' ? 'Admin dashboard' : 'My bookings'}
              </Link>
            ) : (
              <Link
                to="/flights"
                className="h-12 px-7 inline-flex items-center rounded-xl text-sm font-bold text-white border border-white/25 bg-white/10 backdrop-blur-sm hover:bg-white/15 transition-colors"
              >
                Browse all flights
              </Link>
            )}
          </div>
        </div>

        {/* Slide dots */}
        <div className="relative flex items-center justify-center gap-2.5 pb-6">
          {HERO_SLIDES.map((s, i) => (
            <button
              key={s.code}
              onClick={() => setSlide(i)}
              aria-label={`Show ${s.city}`}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === slide ? 'w-7 bg-white' : 'w-2.5 bg-white/45 hover:bg-white/70'
              }`}
            />
          ))}
        </div>

        {/* Stats strip */}
        <dl className="relative hidden sm:flex items-center justify-center gap-12 pb-7">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <dt className="sr-only">{s.label}</dt>
              <dd className="text-2xl font-extrabold tracking-tight tabular-nums text-white">
                {s.value}
              </dd>
              <p className="text-[11px] font-semibold text-white/70 mt-0.5">{s.label}</p>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Departures board + why-fly panel (asymmetric) ────── */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-5 lg:gap-6 items-stretch">
        {/* No overflow-hidden here — the airport picker's panel hangs below
            the header; the list rounds its own bottom corners instead */}
        <div className="relative rounded-3xl bg-[#0b1220] text-white shadow-lift border border-white/10 flex flex-col">
          <div className="flex items-center justify-between gap-3 px-5 sm:px-7 py-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-amber-400/15 border border-amber-300/30 flex items-center justify-center">
                <PlaneIcon className="w-4 h-4 -rotate-45 text-amber-300" />
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/50 font-bold">
                  Departures
                </p>
                <BoardAirportPicker
                  airports={boardAirports}
                  value={boardOrigin}
                  onChange={setBoardOrigin}
                />
              </div>
            </div>
            <span className="inline-flex items-center gap-2 text-[11px] font-bold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live board
            </span>
          </div>

          <div className="hidden sm:grid grid-cols-[100px_1fr_80px_60px_100px] gap-4 px-7 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 border-b border-white/5">
            <span>Flight</span>
            <span>Destination</span>
            <span>Departs</span>
            <span>Gate</span>
            <span className="text-right">Status</span>
          </div>

          <ul className={`divide-y divide-white/5 flex-1 rounded-b-3xl overflow-hidden transition-opacity ${boardSwitching ? 'opacity-50' : ''}`}>
            {!departuresData &&
              Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="px-5 sm:px-7 py-[1.15rem] animate-pulse">
                  <span className="block h-4 rounded bg-white/10" style={{ width: `${55 + (i % 3) * 12}%` }} />
                </li>
              ))}
            {departuresData && departures.length === 0 && (
              <li className="px-5 sm:px-7 py-12 text-center text-sm font-semibold text-white/45">
                No upcoming departures from {boardAirport?.city ?? 'this airport'} — try another
                airport.
              </li>
            )}
            {departures.map((f) => {
              const status = boardStatus(f, now);
              return (
                <li
                  key={f.id}
                  className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[100px_1fr_80px_60px_100px] items-center gap-3 sm:gap-4 px-5 sm:px-7 py-3.5 hover:bg-white/[0.03] transition-colors"
                >
                  <span className="font-mono font-bold text-amber-300 tabular-nums text-sm">
                    {formatFlightNo(f.flightNumber)}
                  </span>
                  <span className="min-w-0">
                    <span className="font-extrabold tracking-tight truncate block">
                      {f.route.destinationAirport.city}
                    </span>
                    <span className="text-[11px] font-semibold text-white/45 sm:hidden">
                      {f.route.destinationAirport.iataCode} · {formatBoardTime(f.departureTime)} ·
                      Gate {f.gate ?? '—'}
                    </span>
                    <span className="hidden sm:block text-[11px] font-semibold text-white/45">
                      {f.route.destinationAirport.iataCode}
                    </span>
                  </span>
                  <span className="hidden sm:block font-mono tabular-nums font-bold text-white/90">
                    {formatBoardTime(f.departureTime)}
                  </span>
                  <span className="hidden sm:block font-mono tabular-nums text-white/60">
                    {f.gate ?? '—'}
                  </span>
                  <span className={`text-right text-xs font-bold ${statusTone[status] ?? 'text-white/60'}`}>
                    {status}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Why-fly panel */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft p-6 sm:p-7 flex flex-col">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Built for the way you fly
          </h2>
          <p className="text-sm font-medium text-ink-soft mt-2 mb-5">
            Everything between "where to next?" and "welcome aboard", in one place.
          </p>
          <ul className="space-y-1 flex-1">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="group flex gap-3.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                <span className="w-10 h-10 shrink-0 rounded-xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-brand-600 group-hover:to-violet-glow group-hover:text-white group-hover:border-transparent transition-colors">
                  <Icon className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-ink text-[15px]">{title}</h3>
                  <p className="text-[13px] font-medium text-ink-soft leading-snug mt-0.5">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Popular destinations (bento) ─────────────────────── */}
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

        <div className="grid grid-cols-2 lg:grid-cols-4 auto-rows-[150px] sm:auto-rows-[175px] gap-3 sm:gap-4">
          {DESTINATIONS.map((d, i) => {
            const featured = i === 0;
            return (
              <Link
                key={d.code}
                to={`/flights?origin=MNL&destination=${d.code}&trip=one&sort=departure&page=1`}
                className={`group relative overflow-hidden rounded-2xl flex flex-col justify-end shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all animate-fade-up bg-slate-200 ${
                  featured ? 'col-span-2 row-span-2' : ''
                }`}
                style={{ animationDelay: `${i * 55}ms` }}
              >
                <img
                  src={DESTINATION_IMAGES[d.code]}
                  alt={d.city}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                {featured && (
                  <span className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-[0.16em] text-white bg-white/15 border border-white/25 backdrop-blur-sm rounded-full px-2.5 py-1">
                    Most popular
                  </span>
                )}
                <PlaneIcon className="absolute top-4 right-4 w-4 h-4 -rotate-45 text-white/70 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                <div className="relative p-4">
                  <p
                    className={`font-extrabold tracking-tight text-white drop-shadow-sm ${
                      featured ? 'text-2xl sm:text-3xl' : 'text-lg'
                    }`}
                  >
                    {d.city}
                  </p>
                  <p className={`font-semibold text-white/70 ${featured ? 'text-sm' : 'text-[11px]'}`}>
                    {d.tag}
                  </p>
                  <p className="mt-2 inline-flex items-center text-[11px] font-bold text-white bg-white/15 border border-white/25 backdrop-blur-sm rounded-full px-2.5 py-1">
                    from ₱{d.from.toLocaleString()}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── How it works (two-column: steps + photo) ─────────── */}
      <section className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Wheels up in three steps
          </h2>
          <p className="text-sm font-medium text-ink-soft mt-2 mb-8">
            From "where to next?" to boarding pass — usually in under two minutes.
          </p>
          <ol className="space-y-6">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-brand-600 to-violet-glow text-white text-sm font-extrabold flex items-center justify-center shadow-soft">
                    {i + 1}
                  </span>
                  {i < STEPS.length - 1 && <span className="flex-1 w-px bg-slate-200 mt-1.5" />}
                </div>
                <div className="pb-2">
                  <h3 className="font-extrabold tracking-tight flex items-center gap-2">
                    <Icon className="w-4 h-4 text-brand-600" />
                    {title}
                  </h3>
                  <p className="text-sm font-medium text-ink-soft mt-1 leading-relaxed max-w-sm">
                    {text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="relative rounded-3xl overflow-hidden shadow-lift min-h-[300px] lg:min-h-[420px] bg-slate-200">
          <img
            src={DESTINATION_IMAGES.ENI}
            alt="El Nido, Palawan"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
              Now boarding
            </p>
            <p className="text-xl font-extrabold tracking-tight text-white">El Nido, Palawan</p>
            <p className="text-xs font-semibold text-white/75">MNL → ENI · from ₱2,650</p>
          </div>
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
