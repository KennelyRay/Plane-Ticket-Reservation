import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { flightApi } from '../../features/flight/api';
import { RETURN_LEG_KEY, type ReturnLeg } from '../../features/booking/returnLeg';
import type { Airport, Flight } from '../../types';
import AirportSelect from '../../components/ui/AirportSelect';
import FlightPathMap from '../../components/flights/FlightPathMap';
import DestinationImage from '../../components/flights/DestinationImage';
import { AlertIcon, ClockIcon, MapIcon, PlaneIcon, SearchIcon, ShieldIcon, SparkIcon, SwapIcon, TicketIcon, XIcon } from '../../components/ui/icons';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });

const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

const toISODate = (d: Date) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const todayISO = () => toISODate(new Date());

const POPULAR_ROUTES: Array<[string, string, string]> = [
  ['MNL', 'CEB', 'Cebu'],
  ['MNL', 'DVO', 'Davao'],
  ['MNL', 'TAG', 'Bohol'],
  ['CRK', 'CEB', 'Cebu'],
  ['MNL', 'SIN', 'Singapore'],
  ['MNL', 'NRT', 'Tokyo'],
];

const HERO_PERKS = [
  { icon: TicketIcon, text: 'Live seat maps' },
  { icon: SparkIcon, text: 'Instant e-tickets' },
  { icon: ShieldIcon, text: 'Secure checkout' },
];

type SortKey = 'departure' | 'price' | 'duration';
type TripType = 'one' | 'round';

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'departure', label: 'Departure' },
  { id: 'price', label: 'Cheapest' },
  { id: 'duration', label: 'Fastest' },
];

type Badge = 'cheapest' | 'fastest';

const BADGES: Record<Badge, { label: string; className: string }> = {
  cheapest: { label: 'Cheapest', className: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  fastest: { label: 'Fastest', className: 'bg-sky-50 border-sky-200 text-sky-700' },
};

const dockLabelClass =
  'block text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft mb-0.5';

function DockNotch({ position }: { position: string }) {
  // Punched-hole illusion: a surface-colored disc straddling the perforation line
  return (
    <span
      aria-hidden
      className={`absolute w-[18px] h-[18px] rounded-full bg-surface border border-slate-200/80 ${position}`}
    />
  );
}

/**
 * Tap-to-open route map for touch / small screens, where the desktop hover
 * popover isn't available. Rendered through a portal so the card's transforms
 * don't trap the fixed overlay. The SVG is forced to fill its container so the
 * 420px map scales down to the phone width.
 */
function FlightRouteModal({
  flight,
  airports,
  onClose,
}: {
  flight: Flight;
  airports: Airport[];
  onClose: () => void;
}) {
  const { route, airline } = flight;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/50 backdrop-blur-sm sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-lift p-4 sm:p-5 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" />
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
              Flight route
            </p>
            <p className="font-extrabold tracking-tight truncate">
              {route.originAirport.city} → {route.destinationAirport.city}
            </p>
            <p className="text-xs font-medium text-ink-soft truncate">
              {airline.name} · {flight.flightNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close route map"
            className="w-9 h-9 shrink-0 rounded-lg border border-slate-200 text-ink-soft hover:bg-slate-50 flex items-center justify-center"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="[&_svg]:w-full [&_svg]:h-auto rounded-xl overflow-hidden border border-slate-200/70">
          <FlightPathMap
            airports={airports}
            origin={route.originAirport}
            destination={route.destinationAirport}
          />
        </div>

        <div className="flex items-center justify-between mt-3 text-xs font-semibold text-ink-soft">
          <span className="font-bold text-ink">
            {route.originAirport.iataCode} → {route.destinationAirport.iataCode}
          </span>
          <span>
            {route.distanceKm
              ? `${Number(route.distanceKm).toLocaleString()} km · direct`
              : 'Direct'}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

function FlightCard({
  flight,
  index,
  badge,
  airports,
  onSelect,
  departed = false,
}: {
  flight: Flight;
  index: number;
  badge?: Badge;
  airports: Airport[];
  onSelect: (flight: Flight) => void;
  departed?: boolean;
}) {
  const { route, airline } = flight;
  const hasPath =
    route.originAirport.latitude != null && route.destinationAirport.latitude != null;
  // Flip the map popover under the card when the card sits too close to the
  // top of the viewport for it to fit above (measured as the hover starts).
  const [mapBelow, setMapBelow] = useState(false);
  const [showMap, setShowMap] = useState(false);

  return (
    <article
      className={`group relative hover:z-20 bg-white rounded-2xl border shadow-soft transition-all duration-300 animate-fade-up ${
        departed
          ? 'border-slate-200/70 opacity-75'
          : 'border-slate-200/80 hover:shadow-lift hover:border-brand-200 hover:-translate-y-0.5'
      }`}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      onMouseEnter={(e) => setMapBelow(e.currentTarget.getBoundingClientRect().top < 420)}
    >
      {/* Route-map preview, revealed on hover (desktop only) */}
      {hasPath && (
        <div
          className={`pointer-events-none hidden lg:block absolute left-1/2 -translate-x-1/2 z-30 opacity-0 invisible scale-95 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:scale-100 transition-all duration-200 ${
            mapBelow
              ? 'top-full mt-2 -translate-y-2 origin-top'
              : 'bottom-full mb-2 translate-y-2 origin-bottom'
          }`}
        >
          <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-lift p-2.5">
            <FlightPathMap
              airports={airports}
              origin={route.originAirport}
              destination={route.destinationAirport}
            />
            <div className="flex items-center justify-between gap-4 px-1.5 pt-2 pb-0.5">
              <span className="text-xs font-bold text-ink truncate">
                {route.originAirport.city} → {route.destinationAirport.city}
              </span>
              <span className="text-[11px] font-semibold text-ink-soft shrink-0">
                {route.distanceKm
                  ? `${Number(route.distanceKm).toLocaleString()} km · direct`
                  : 'Direct'}
              </span>
            </div>
            <span
              className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white ${
                mapBelow
                  ? '-top-1.5 border-l border-t border-slate-200/80'
                  : '-bottom-1.5 border-r border-b border-slate-200/80'
              }`}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-stretch">
        {/* Destination photo: top banner on mobile, left column on desktop */}
        <DestinationImage
          airport={route.destinationAirport}
          className="h-28 lg:h-auto lg:w-40 shrink-0 rounded-t-2xl lg:rounded-t-none lg:rounded-l-2xl"
        />

        {/* Journey panel */}
        <div className="flex-1 min-w-0 p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-violet-glow flex items-center justify-center text-sm font-extrabold text-white shadow-soft shrink-0">
              {airline.iataCode}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink truncate">{airline.name}</p>
              <p className="text-xs font-medium text-ink-soft">
                {flight.flightNumber} · {formatDate(flight.departureTime)}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2 shrink-0">
              {departed ? (
                <span className="px-2.5 py-1 rounded-full border border-slate-200 bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                  Departed
                </span>
              ) : (
                <>
                  {badge && (
                    <span
                      className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${BADGES[badge].className}`}
                    >
                      {BADGES[badge].label}
                    </span>
                  )}
                  <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                    Direct
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="text-left shrink-0">
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums">
                {formatTime(flight.departureTime)}
              </p>
              <p className="text-sm font-bold text-brand-700">{route.originAirport.iataCode}</p>
              <p className="text-xs text-ink-soft truncate max-w-24">{route.originAirport.city}</p>
            </div>

            <div className="flex-1 flex flex-col items-center px-1 min-w-0">
              <p className="text-[11px] font-bold text-ink-soft mb-1.5 tabular-nums">
                {formatDuration(route.durationMinutes)}
              </p>
              <div className="w-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full border-2 border-brand-400 bg-white" />
                <span className="flex-1 border-t-2 border-dotted border-slate-300" />
                <span className="w-7 h-7 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center">
                  <PlaneIcon className="w-3.5 h-3.5 text-brand-600 group-hover:translate-x-0.5 transition-transform" />
                </span>
                <span className="flex-1 border-t-2 border-dotted border-slate-300" />
                <span className="w-2 h-2 rounded-full bg-violet-glow" />
              </div>
              <p className="text-[11px] font-medium text-ink-soft mt-1.5">
                {route.distanceKm ? `${Number(route.distanceKm).toLocaleString()} km · non-stop` : 'Non-stop'}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums">
                {formatTime(flight.arrivalTime)}
              </p>
              <p className="text-sm font-bold text-violet-glow">
                {route.destinationAirport.iataCode}
              </p>
              <p className="text-xs text-ink-soft truncate max-w-24 ml-auto">
                {route.destinationAirport.city}
              </p>
            </div>
          </div>

          {/* Tap-to-view route map — the hover preview above is desktop-only */}
          {hasPath && (
            <button
              type="button"
              onClick={() => setShowMap(true)}
              className="lg:hidden mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-bold text-brand-700 hover:border-brand-300 hover:bg-brand-50 transition-colors"
            >
              <MapIcon className="w-3.5 h-3.5" />
              View route map
            </button>
          )}
        </div>

        {/* Fare stub — perforated like a paper ticket */}
        <div className="relative lg:w-60 shrink-0 border-t lg:border-t-0 lg:border-l border-dashed border-slate-300 bg-slate-50/60 rounded-bl-2xl rounded-br-2xl lg:rounded-bl-none lg:rounded-tr-2xl p-5 sm:p-6 flex lg:flex-col items-center justify-between lg:justify-center gap-4">
          <DockNotch position="lg:hidden -top-[9px] -left-[9px]" />
          <DockNotch position="lg:hidden -top-[9px] -right-[9px]" />
          <DockNotch position="hidden lg:block -top-[9px] -left-[9px]" />
          <DockNotch position="hidden lg:block -bottom-[9px] -left-[9px]" />

          <div className="lg:text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
              Economy from
            </p>
            <p className="text-2xl font-extrabold tracking-tight text-ink tabular-nums">
              ₱{Number(flight.economyPrice).toLocaleString()}
            </p>
            {flight.businessPrice ? (
              <p className="text-[11px] font-semibold text-indigo-600 tabular-nums">
                Business ₱{Number(flight.businessPrice).toLocaleString()}
              </p>
            ) : (
              <p className="text-[11px] font-medium text-ink-soft">per passenger</p>
            )}
          </div>

          {departed ? (
            <span className="h-11 px-5 lg:w-full rounded-xl inline-flex items-center justify-center text-sm font-bold text-ink-soft bg-slate-100 border border-slate-200 cursor-not-allowed shrink-0">
              Departed
            </span>
          ) : (
            <button
              onClick={() => onSelect(flight)}
              className="h-11 px-5 lg:w-full rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.98] transition-all shrink-0"
            >
              Select seats
            </button>
          )}

          <div
            aria-hidden
            className="hidden lg:block w-full h-6 opacity-20 bg-[repeating-linear-gradient(90deg,#0b1526_0px,#0b1526_2px,transparent_2px,transparent_5px)]"
          />
        </div>
      </div>

      {showMap && hasPath && (
        <FlightRouteModal flight={flight} airports={airports} onClose={() => setShowMap(false)} />
      )}
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 animate-pulse">
      <div className="flex items-center gap-5">
        <div className="w-11 h-11 rounded-xl bg-slate-200" />
        <div className="flex-1 space-y-2.5">
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="h-3 w-2/3 rounded bg-slate-100" />
        </div>
        <div className="hidden sm:block h-11 w-32 rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}

export default function FlightSearch() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // The URL is the source of truth for the executed search (deep-linkable);
  // the form is a draft initialized from it.
  const executed = {
    origin: searchParams.get('origin') ?? 'MNL',
    destination: searchParams.get('destination') ?? 'CEB',
    date: searchParams.get('date') ?? '',
    returnDate: searchParams.get('return') ?? '',
    trip: (searchParams.get('trip') === 'round' ? 'round' : 'one') as TripType,
    sort: (SORTS.some((s) => s.id === searchParams.get('sort'))
      ? searchParams.get('sort')
      : 'departure') as SortKey,
    page: Math.max(1, Number(searchParams.get('page')) || 1),
  };

  const [form, setForm] = useState({
    origin: executed.origin,
    destination: executed.destination,
    date: executed.date,
    returnDate: executed.returnDate,
    trip: executed.trip,
  });
  const [airlineFilter, setAirlineFilter] = useState<string | null>(null);

  const { data: airports = [] } = useQuery({
    queryKey: ['airports'],
    queryFn: flightApi.airports,
    staleTime: Infinity,
  });

  const { data: routePairs = [] } = useQuery({
    queryKey: ['route-map'],
    queryFn: flightApi.routes,
    staleTime: Infinity,
  });

  // origin IATA → set of reachable destination IATAs
  const destinationMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    routePairs.forEach(({ origin, destination }) => {
      if (!map.has(origin)) map.set(origin, new Set());
      map.get(origin)!.add(destination);
    });
    return map;
  }, [routePairs]);

  // The "To" list only offers destinations actually served from the chosen
  // origin; with no origin picked it offers every airport.
  const destinationAirports = useMemo(() => {
    const reachable = form.origin ? destinationMap.get(form.origin) : null;
    return reachable ? airports.filter((a) => reachable.has(a.iataCode)) : airports;
  }, [airports, destinationMap, form.origin]);

  const { data, isLoading, isError, isPlaceholderData } = useQuery({
    queryKey: ['flights', executed.origin, executed.destination, executed.date, executed.sort, executed.page],
    queryFn: () =>
      flightApi.search({
        origin: executed.origin || undefined,
        destination: executed.destination || undefined,
        date: executed.date || undefined,
        sort: executed.sort,
        page: executed.page,
      }),
    placeholderData: keepPreviousData,
  });

  const applySearch = (next: Partial<typeof form> & { sort?: SortKey; page?: number }) => {
    const merged = { ...form, ...next };
    setAirlineFilter(null);
    const params: Record<string, string> = {
      origin: merged.origin,
      destination: merged.destination,
      trip: merged.trip,
      sort: next.sort ?? executed.sort,
      page: String(next.page ?? 1),
    };
    if (merged.date) params.date = merged.date;
    if (merged.trip === 'round' && merged.returnDate) params.return = merged.returnDate;
    setSearchParams(params);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applySearch({});
  };

  const swap = () => setForm((f) => ({ ...f, origin: f.destination, destination: f.origin }));

  const pickRoute = (origin: string, destination: string) => {
    setForm((f) => ({ ...f, origin, destination }));
    applySearch({ origin, destination });
  };

  const setTrip = (trip: TripType) => setForm((f) => ({ ...f, trip }));

  // Reset every criterion; empty origin/destination params mean "browse everything"
  const clearSearch = () => {
    setForm({ origin: '', destination: '', date: '', returnDate: '', trip: 'one' });
    setAirlineFilter(null);
    setSearchParams({ origin: '', destination: '', trip: 'one', sort: 'departure', page: '1' });
  };

  const goToPage = (page: number) => {
    applySearch({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Hand the return leg to the booking flow: after the outbound is paid,
  // the booking page offers this search back to the user.
  const selectFlight = (flight: Flight) => {
    if (executed.trip === 'round' && executed.returnDate) {
      const leg: ReturnLeg = {
        origin: executed.destination,
        destination: executed.origin,
        date: executed.returnDate,
        outboundFlightId: flight.id,
      };
      sessionStorage.setItem(RETURN_LEG_KEY, JSON.stringify(leg));
    } else {
      sessionStorage.removeItem(RETURN_LEG_KEY);
    }
    navigate(`/flights/${flight.id}/seats`);
  };

  // ±3-day strip around the searched date
  const dateStrip = useMemo(() => {
    if (!executed.date) return [];
    const base = new Date(executed.date);
    const days: string[] = [];
    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(base);
      d.setDate(d.getDate() + offset);
      const iso = toISODate(d);
      if (iso >= todayISO()) days.push(iso);
    }
    return days;
  }, [executed.date]);

  const airlines = useMemo(() => {
    const seen = new Map<string, string>();
    data?.flights.forEach((f) => seen.set(f.airline.iataCode, f.airline.name));
    return [...seen.entries()];
  }, [data]);

  const visibleFlights = useMemo(() => {
    const list = data?.flights ?? [];
    return airlineFilter ? list.filter((f) => f.airline.iataCode === airlineFilter) : list;
  }, [data, airlineFilter]);

  // Split already-departed flights out — they can't be booked and drop into their
  // own section below the bookable results.
  const { bookableFlights, departedFlights } = useMemo(() => {
    const now = Date.now();
    return {
      bookableFlights: visibleFlights.filter((f) => new Date(f.departureTime).getTime() > now),
      departedFlights: visibleFlights.filter((f) => new Date(f.departureTime).getTime() <= now),
    };
  }, [visibleFlights]);

  // Highlight the best fares among bookable flights (only meaningful with 2+ options)
  const highlights = useMemo(() => {
    if (bookableFlights.length < 2) return { cheapestId: null, fastestId: null };
    let cheapest = bookableFlights[0];
    let fastest = bookableFlights[0];
    for (const f of bookableFlights) {
      if (Number(f.economyPrice) < Number(cheapest.economyPrice)) cheapest = f;
      if (f.route.durationMinutes < fastest.route.durationMinutes) fastest = f;
    }
    return { cheapestId: cheapest.id, fastestId: fastest.id };
  }, [bookableFlights]);

  const badgeFor = (f: Flight): Badge | undefined =>
    f.id === highlights.cheapestId ? 'cheapest' : f.id === highlights.fastestId ? 'fastest' : undefined;

  const pagination = data?.pagination;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-brand-950 text-white shadow-lift">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(600px 280px at 12% -10%, rgb(37 99 235 / 0.55), transparent 60%), radial-gradient(520px 260px at 88% 8%, rgb(124 58 237 / 0.5), transparent 60%), radial-gradient(400px 200px at 55% 115%, rgb(14 165 233 / 0.25), transparent 60%)',
          }}
        />
        <svg
          className="pointer-events-none absolute inset-x-0 top-6 w-full h-28 opacity-20"
          viewBox="0 0 800 120"
          fill="none"
          preserveAspectRatio="none"
        >
          <path d="M-20 100 C 200 20, 500 140, 820 30" stroke="white" strokeWidth="1.5" strokeDasharray="2 8" />
        </svg>
        <div className="pointer-events-none hidden md:block absolute right-10 top-12 animate-float">
          <span className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm flex items-center justify-center shadow-lift">
            <PlaneIcon className="w-8 h-8 text-white -rotate-45" />
          </span>
        </div>

        <div className="relative px-6 sm:px-10 pt-12 pb-32 sm:pt-16 sm:pb-36">
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-200 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 mb-5 animate-fade-in">
            <PlaneIcon className="w-3.5 h-3.5 -rotate-45" />
            Live seat selection on every flight
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] max-w-2xl animate-fade-up">
            Where to next?
          </h1>
          <p
            className="mt-3 max-w-xl text-[15px] text-brand-100/90 font-medium animate-fade-up"
            style={{ animationDelay: '80ms' }}
          >
            Search real-time schedules, compare fares and lock in your favorite seat — all in one
            place.
          </p>
          <div
            className="mt-6 flex flex-wrap items-center gap-2.5 animate-fade-up"
            style={{ animationDelay: '160ms' }}
          >
            {HERO_PERKS.map(({ icon: Icon, text }) => (
              <span
                key={text}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-brand-100"
              >
                <Icon className="w-3.5 h-3.5 text-brand-200" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Booking dock — one unified bar floating over the hero */}
      <form
        onSubmit={handleSubmit}
        // z-10 lifts the dock (and the airport dropdowns inside it) above the
        // result cards, whose fade-up transform otherwise paints over them
        className="relative z-10 mx-2 sm:mx-8 bg-white rounded-2xl border border-slate-200/80 shadow-lift animate-fade-up"
        style={{ animationDelay: '140ms', marginTop: 'calc(-6.5rem)' }}
      >
        {/* Trip type header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            {(
              [
                ['one', 'One way'],
                ['round', 'Round trip'],
              ] as [TripType, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTrip(id)}
                className={`px-4 h-8 rounded-md text-xs font-bold transition-colors ${
                  form.trip === id
                    ? 'bg-white text-brand-700 shadow-soft'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-[11px] font-semibold text-ink-soft">
              All fares in ₱ PHP · taxes included
            </span>
            <button
              type="button"
              onClick={clearSearch}
              className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold text-ink-soft border border-slate-200 hover:border-red-200 hover:text-red-600 hover:bg-red-50/60 transition-colors"
            >
              <XIcon className="w-3.5 h-3.5" />
              Clear search
            </button>
          </div>
        </div>

        {/* Segmented field bar */}
        <div
          className={`grid grid-cols-2 border-t border-slate-100 ${
            form.trip === 'round'
              ? 'lg:grid-cols-[1.1fr_1.1fr_0.9fr_0.9fr_auto]'
              : 'lg:grid-cols-[1.1fr_1.1fr_1fr_auto]'
          }`}
        >
          <div className="relative px-4 sm:px-5 py-3.5 focus-within:bg-brand-50/40 transition-colors">
            <AirportSelect
              label="From"
              value={form.origin}
              onChange={(origin) =>
                setForm((f) => ({
                  ...f,
                  origin,
                  // drop a destination that isn't served from the new origin
                  destination:
                    origin &&
                    f.destination &&
                    destinationMap.size > 0 &&
                    !destinationMap.get(origin)?.has(f.destination)
                      ? ''
                      : f.destination,
                }))
              }
              airports={airports}
              hintClass="text-brand-600/80"
            />
            <button
              type="button"
              onClick={swap}
              title="Swap origin and destination"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 bg-white text-ink-soft shadow-soft hover:text-brand-600 hover:border-brand-300 hover:rotate-180 transition-all duration-300"
            >
              <SwapIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="relative px-4 sm:px-5 py-3.5 pl-8 sm:pl-9 border-l border-slate-100 focus-within:bg-brand-50/40 transition-colors">
            <AirportSelect
              label={form.origin ? `To · ${destinationAirports.length} destinations` : 'To'}
              value={form.destination}
              onChange={(destination) => setForm((f) => ({ ...f, destination }))}
              airports={destinationAirports}
              hintClass="text-violet-glow/80"
              align="right"
            />
          </div>

          <div className="px-4 sm:px-5 py-3.5 border-t lg:border-t-0 lg:border-l border-slate-100 focus-within:bg-brand-50/40 transition-colors">
            <label className={dockLabelClass}>Departure</label>
            <input
              type="date"
              value={form.date}
              min={todayISO()}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full h-8 bg-transparent text-[15px] font-bold text-ink focus:outline-none"
            />
            <p className="text-[11px] font-medium text-ink-soft truncate">
              {form.date ? formatDate(form.date) : 'Any date'}
            </p>
          </div>

          {form.trip === 'round' && (
            <div className="px-4 sm:px-5 py-3.5 border-t lg:border-t-0 border-l border-slate-100 focus-within:bg-brand-50/40 transition-colors animate-fade-in">
              <label className={dockLabelClass}>Return</label>
              <input
                type="date"
                value={form.returnDate}
                min={form.date || todayISO()}
                required
                onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
                className="w-full h-8 bg-transparent text-[15px] font-bold text-ink focus:outline-none"
              />
              <p className="text-[11px] font-medium text-ink-soft truncate">
                {form.returnDate ? formatDate(form.returnDate) : 'Pick a date'}
              </p>
            </div>
          )}

          <div className="col-span-2 lg:col-span-1 border-t lg:border-t-0 lg:border-l border-slate-100 p-3 flex items-stretch">
            <button
              type="submit"
              className="w-full lg:w-auto px-7 rounded-xl inline-flex items-center justify-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.98] transition-all min-h-12"
            >
              <SearchIcon className="w-4 h-4" />
              Search flights
            </button>
          </div>
        </div>

        {/* Popular routes footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50/70 rounded-b-2xl flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft mr-1">
            Popular
          </span>
          {POPULAR_ROUTES.map(([o, d, city]) => (
            <button
              key={`${o}${d}`}
              type="button"
              onClick={() => pickRoute(o, d)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                form.origin === o && form.destination === d
                  ? 'bg-brand-600 border-brand-600 text-white'
                  : 'bg-white border-slate-200 text-ink-soft hover:border-brand-300 hover:text-brand-700'
              }`}
            >
              {o} → {city}
            </button>
          ))}
        </div>
      </form>

      {/* Results */}
      <section>
        {/* Date strip */}
        {dateStrip.length > 1 && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {dateStrip.map((iso) => {
              const active = iso === executed.date;
              const d = new Date(iso);
              return (
                <button
                  key={iso}
                  onClick={() => {
                    setForm((f) => ({ ...f, date: iso }));
                    applySearch({ date: iso });
                  }}
                  className={`shrink-0 px-4 py-2 rounded-xl border text-center transition-colors ${
                    active
                      ? 'bg-brand-600 border-brand-600 text-white shadow-soft'
                      : 'bg-white border-slate-200 text-ink-soft hover:border-brand-300 hover:text-brand-700'
                  }`}
                >
                  <span className="block text-[10px] font-bold uppercase tracking-wide">
                    {d.toLocaleDateString([], { weekday: 'short' })}
                  </span>
                  <span className="block text-sm font-extrabold tabular-nums">
                    {d.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {executed.trip === 'round' && executed.returnDate && (
          <div className="mb-4 p-3.5 rounded-xl bg-brand-50 border border-brand-100 text-brand-800 text-sm font-semibold animate-fade-in flex items-start gap-2">
            <PlaneIcon className="w-4 h-4 -rotate-45 mt-0.5 shrink-0 text-brand-600" />
            <span>
              Round trip — pick your <span className="font-extrabold">outbound</span> flight first.
              After payment we'll bring you back for the return leg (
              {executed.destination || 'anywhere'} → {executed.origin || 'anywhere'} ·{' '}
              {formatDate(executed.returnDate)}).
            </span>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {isError && (
          <div className="bg-white rounded-2xl border border-red-100 p-10 text-center">
            <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
              <AlertIcon className="w-7 h-7" />
            </div>
            <p className="font-bold text-ink">We couldn't reach the booking service</p>
            <p className="text-sm text-ink-soft mt-1">Please try again in a moment.</p>
          </div>
        )}

        {data && data.flights.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center animate-fade-in">
            <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <PlaneIcon className="w-8 h-8 -rotate-45" />
            </div>
            <p className="text-lg font-bold text-ink">No flights on this route yet</p>
            <p className="text-sm text-ink-soft mt-1">
              Try different airports or another date — popular routes always have seats.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {POPULAR_ROUTES.slice(0, 4).map(([o, d, city]) => (
                <button
                  key={`${o}${d}`}
                  onClick={() => pickRoute(o, d)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-ink-soft hover:border-brand-300 hover:text-brand-700 transition-colors"
                >
                  {o} → {city}
                </button>
              ))}
              <button
                onClick={clearSearch}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift transition-all"
              >
                Browse all flights
              </button>
            </div>
          </div>
        )}

        {data && data.flights.length > 0 && (
          <>
            {/* Route summary + controls */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="mr-auto">
                <h2 className="text-xl font-extrabold tracking-tight">
                  {executed.origin || 'Anywhere'}
                  <span className="text-ink-soft font-bold mx-1.5">→</span>
                  {executed.destination || 'Anywhere'}
                </h2>
                <p className="text-xs font-semibold text-ink-soft">
                  {pagination?.total} flight{pagination?.total === 1 ? '' : 's'} ·{' '}
                  {executed.date ? formatDate(executed.date) : 'all upcoming dates'}
                </p>
              </div>

              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-soft">
                {SORTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => applySearch({ sort: s.id })}
                    className={`px-3.5 h-9 rounded-lg text-xs font-bold transition-colors ${
                      executed.sort === s.id
                        ? 'bg-brand-600 text-white shadow-soft'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {airlines.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft mr-1">
                  Airline
                </span>
                <button
                  onClick={() => setAirlineFilter(null)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                    airlineFilter === null
                      ? 'bg-brand-600 border-brand-600 text-white'
                      : 'bg-white border-slate-200 text-ink-soft hover:border-brand-300'
                  }`}
                >
                  All
                </button>
                {airlines.map(([code, name]) => (
                  <button
                    key={code}
                    onClick={() => setAirlineFilter(airlineFilter === code ? null : code)}
                    title={name}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                      airlineFilter === code
                        ? 'bg-brand-600 border-brand-600 text-white'
                        : 'bg-white border-slate-200 text-ink-soft hover:border-brand-300'
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}

            <div className={`space-y-3.5 ${isPlaceholderData ? 'opacity-60' : ''}`}>
              {bookableFlights.map((flight, i) => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  index={i}
                  badge={badgeFor(flight)}
                  airports={airports}
                  onSelect={selectFlight}
                />
              ))}
              {visibleFlights.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center">
                  <p className="text-sm font-semibold text-ink-soft">
                    No flights from this airline on the current page — try clearing the filter.
                  </p>
                </div>
              )}
            </div>

            {departedFlights.length > 0 && (
              <section className={`mt-8 ${isPlaceholderData ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-2 mb-3">
                  <ClockIcon className="w-4 h-4 text-ink-soft" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">
                    Departed
                  </h3>
                  <span className="text-xs font-medium text-ink-soft">· no longer bookable</span>
                </div>
                <div className="space-y-3.5">
                  {departedFlights.map((flight, i) => (
                    <FlightCard
                      key={flight.id}
                      flight={flight}
                      index={i}
                      airports={airports}
                      onSelect={selectFlight}
                      departed
                    />
                  ))}
                </div>
              </section>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  disabled={pagination.page <= 1 || isPlaceholderData}
                  onClick={() => goToPage(pagination.page - 1)}
                  className="h-10 px-4 rounded-xl text-sm font-bold border border-slate-200 bg-white text-ink hover:border-brand-300 hover:text-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <span className="text-xs font-bold text-ink-soft tabular-nums">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  disabled={pagination.page >= pagination.totalPages || isPlaceholderData}
                  onClick={() => goToPage(pagination.page + 1)}
                  className="h-10 px-4 rounded-xl text-sm font-bold border border-slate-200 bg-white text-ink hover:border-brand-300 hover:text-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
