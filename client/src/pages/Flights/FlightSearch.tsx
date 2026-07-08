import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { flightApi, type FlightSearchParams } from '../../features/flight/api';
import type { Flight } from '../../types';
import { PlaneIcon, SearchIcon, SwapIcon } from '../../components/ui/icons';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });

const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

const POPULAR_ROUTES: Array<[string, string, string]> = [
  ['MNL', 'CEB', 'Cebu'],
  ['MNL', 'DVO', 'Davao'],
  ['MNL', 'ILO', 'Iloilo'],
  ['MNL', 'SIN', 'Singapore'],
  ['MNL', 'NRT', 'Tokyo'],
];

type SortKey = 'departure' | 'price' | 'duration';

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'departure', label: 'Departure time' },
  { id: 'price', label: 'Price (low → high)' },
  { id: 'duration', label: 'Duration' },
];

const fieldClass =
  'w-full h-12 px-3.5 rounded-xl border border-slate-200 bg-white text-[15px] font-semibold text-ink placeholder:text-slate-300 placeholder:font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-400 transition-shadow';

function FlightCard({ flight, index }: { flight: Flight; index: number }) {
  const { route, airline } = flight;
  const navigate = useNavigate();

  return (
    <div
      className="group bg-white rounded-2xl border border-slate-200/80 shadow-soft hover:shadow-lift hover:border-brand-200 transition-all duration-300 animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-5">
        {/* Airline */}
        <div className="flex items-center gap-3 lg:w-48 shrink-0">
          <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-sm font-extrabold text-brand-700">
            {airline.iataCode}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink truncate">{airline.name}</p>
            <p className="text-xs font-medium text-ink-soft">
              {flight.flightNumber} · {formatDate(flight.departureTime)}
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 flex items-center gap-3 sm:gap-5">
          <div className="text-left">
            <p className="text-2xl font-extrabold tracking-tight">{formatTime(flight.departureTime)}</p>
            <p className="text-sm font-bold text-brand-700">{route.originAirport.iataCode}</p>
            <p className="text-xs text-ink-soft">{route.originAirport.city}</p>
          </div>

          <div className="flex-1 flex flex-col items-center px-1">
            <p className="text-[11px] font-semibold text-ink-soft mb-1.5">
              {formatDuration(route.durationMinutes)}
            </p>
            <div className="w-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
              <span className="flex-1 border-t-2 border-dotted border-slate-300" />
              <PlaneIcon className="w-4 h-4 text-brand-500 group-hover:translate-x-1 transition-transform" />
              <span className="flex-1 border-t-2 border-dotted border-slate-300" />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-glow" />
            </div>
            <p className="text-[11px] font-medium text-emerald-600 mt-1.5">Direct</p>
          </div>

          <div className="text-right">
            <p className="text-2xl font-extrabold tracking-tight">{formatTime(flight.arrivalTime)}</p>
            <p className="text-sm font-bold text-violet-glow">{route.destinationAirport.iataCode}</p>
            <p className="text-xs text-ink-soft">{route.destinationAirport.city}</p>
          </div>
        </div>

        {/* Price + CTA */}
        <div className="flex lg:flex-col items-center lg:items-end justify-between gap-2 lg:w-44 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-6">
          <div className="lg:text-right">
            <p className="text-[11px] font-semibold text-ink-soft uppercase tracking-wide">from</p>
            <p className="text-2xl font-extrabold tracking-tight text-ink">
              ₱{Number(flight.economyPrice).toLocaleString()}
            </p>
            <p className="text-[11px] font-medium text-ink-soft">Economy · per passenger</p>
            {flight.businessPrice && (
              <p className="text-[11px] font-semibold text-indigo-600">
                Business ₱{Number(flight.businessPrice).toLocaleString()}
              </p>
            )}
          </div>
          <button
            onClick={() => navigate(`/flights/${flight.id}/seats`)}
            className="px-5 h-11 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.98] transition-all"
          >
            Select seats
          </button>
        </div>
      </div>
    </div>
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
  const [form, setForm] = useState({ origin: 'MNL', destination: 'CEB', date: '' });
  const [params, setParams] = useState<FlightSearchParams | null>({ origin: 'MNL', destination: 'CEB' });
  const [sort, setSort] = useState<SortKey>('departure');
  const [airlineFilter, setAirlineFilter] = useState<string | null>(null);

  const { data, isLoading, isError, isPlaceholderData } = useQuery({
    queryKey: ['flights', params],
    queryFn: () => flightApi.search(params!),
    enabled: !!params,
    placeholderData: keepPreviousData,
  });

  const search = (origin: string, destination: string, date: string) => {
    setAirlineFilter(null);
    setParams({
      origin: origin || undefined,
      destination: destination || undefined,
      date: date || undefined,
      page: 1,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search(form.origin, form.destination, form.date);
  };

  const swap = () =>
    setForm((f) => ({ ...f, origin: f.destination, destination: f.origin }));

  const pickRoute = (origin: string, destination: string) => {
    setForm((f) => ({ ...f, origin, destination }));
    search(origin, destination, form.date);
  };

  const goToPage = (page: number) => {
    setParams((p) => ({ ...p, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Airlines present in the current results (for the filter chips)
  const airlines = useMemo(() => {
    const seen = new Map<string, string>();
    data?.flights.forEach((f) => seen.set(f.airline.iataCode, f.airline.name));
    return [...seen.entries()];
  }, [data]);

  const visibleFlights = useMemo(() => {
    let list = data?.flights ?? [];
    if (airlineFilter) list = list.filter((f) => f.airline.iataCode === airlineFilter);
    return [...list].sort((a, b) => {
      if (sort === 'price') return Number(a.economyPrice) - Number(b.economyPrice);
      if (sort === 'duration') return a.route.durationMinutes - b.route.durationMinutes;
      return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
    });
  }, [data, sort, airlineFilter]);

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
        {/* faint flight path */}
        <svg
          className="pointer-events-none absolute inset-x-0 top-6 w-full h-28 opacity-20"
          viewBox="0 0 800 120"
          fill="none"
          preserveAspectRatio="none"
        >
          <path d="M-20 100 C 200 20, 500 140, 820 30" stroke="white" strokeWidth="1.5" strokeDasharray="2 8" />
        </svg>

        <div className="relative px-6 sm:px-10 pt-12 pb-28 sm:pt-16 sm:pb-32">
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-200 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 mb-5 animate-fade-in">
            <PlaneIcon className="w-3.5 h-3.5 -rotate-45" />
            Live seat selection on every flight
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] max-w-2xl animate-fade-up">
            Where to next?
          </h1>
          <p className="mt-3 max-w-xl text-[15px] text-brand-100/90 font-medium animate-fade-up" style={{ animationDelay: '80ms' }}>
            Search real-time schedules, compare fares and lock in your favorite seat — all in one place.
          </p>
        </div>
      </section>

      {/* Search panel — floats over the hero */}
      <form
        onSubmit={handleSubmit}
        className="relative -mt-28 sm:-mt-30 mx-2 sm:mx-8 bg-white rounded-2xl border border-slate-200/80 shadow-lift p-4 sm:p-5 animate-fade-up"
        style={{ animationDelay: '140ms', marginTop: 'calc(-5.5rem)' }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-ink-soft mb-1.5">
              From
            </label>
            <input
              value={form.origin}
              onChange={(e) => setForm({ ...form, origin: e.target.value.toUpperCase() })}
              className={fieldClass}
              placeholder="MNL"
              maxLength={3}
            />
          </div>

          <button
            type="button"
            onClick={swap}
            title="Swap origin and destination"
            className="hidden lg:flex mb-1.5 w-9 h-9 items-center justify-center rounded-full border border-slate-200 bg-white text-ink-soft hover:text-brand-600 hover:border-brand-300 hover:rotate-180 transition-all duration-300 self-end"
          >
            <SwapIcon className="w-4 h-4" />
          </button>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-ink-soft mb-1.5">
              To
            </label>
            <input
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value.toUpperCase() })}
              className={fieldClass}
              placeholder="CEB"
              maxLength={3}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-ink-soft mb-1.5">
              Departure
            </label>
            <input
              type="date"
              value={form.date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={fieldClass}
            />
          </div>

          <button
            type="submit"
            className="h-12 px-6 rounded-xl inline-flex items-center justify-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.98] transition-all"
          >
            <SearchIcon className="w-4 h-4" />
            Search
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
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
                  : 'bg-slate-50 border-slate-200 text-ink-soft hover:border-brand-300 hover:text-brand-700'
              }`}
            >
              {o} → {city}
            </button>
          ))}
        </div>
      </form>

      {/* Results */}
      <section>
        {isLoading && (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {isError && (
          <div className="bg-white rounded-2xl border border-red-100 p-10 text-center">
            <p className="text-3xl mb-2">🛰️</p>
            <p className="font-bold text-ink">We couldn't reach the booking service</p>
            <p className="text-sm text-ink-soft mt-1">Please try again in a moment.</p>
          </div>
        )}

        {data && data.flights.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center animate-fade-in">
            <p className="text-4xl mb-3">🛫</p>
            <p className="text-lg font-bold text-ink">No flights on this route yet</p>
            <p className="text-sm text-ink-soft mt-1">
              Try different airports or another date — popular routes always have seats.
            </p>
          </div>
        )}

        {data && data.flights.length > 0 && (
          <>
            {/* Results toolbar: count, airline filter, sort */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h2 className="text-lg font-extrabold tracking-tight">
                {pagination?.total} flight{pagination?.total === 1 ? '' : 's'} available
              </h2>

              {airlines.length > 1 && (
                <div className="flex items-center gap-1.5 sm:ml-2">
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

              <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-ink-soft">
                Sort by
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="h-9 pl-3 pr-8 rounded-lg border border-slate-200 bg-white text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/60"
                >
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={`space-y-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
              {visibleFlights.map((flight, i) => (
                <FlightCard key={flight.id} flight={flight} index={i} />
              ))}
              {visibleFlights.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center">
                  <p className="text-sm font-semibold text-ink-soft">
                    No flights from this airline on the current page — try clearing the filter.
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
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
