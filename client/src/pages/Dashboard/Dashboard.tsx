import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../features/auth/store';
import { bookingApi, type Booking } from '../../features/booking/api';
import { flightApi } from '../../features/flight/api';
import { statusChip } from '../Booking/BookingDetail';
import FlightPathMap from '../../components/flights/FlightPathMap';
import { CheckInIcon, GlobeIcon, PlaneIcon, SearchIcon, TicketIcon } from '../../components/ui/icons';

const today = new Date().toLocaleDateString([], {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

const daysUntil = (iso: string) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - start.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
};

const isUpcoming = (b: Booking) =>
  (b.status === 'CONFIRMED' || b.status === 'PENDING') &&
  new Date(b.flight.departureTime) > new Date();

// Paid bookings whose flight is currently in the air
const isInFlight = (b: Booking, now: number) =>
  (b.status === 'CONFIRMED' || b.status === 'COMPLETED') &&
  new Date(b.flight.departureTime).getTime() <= now &&
  new Date(b.flight.arrivalTime).getTime() > now;

/** Re-renders on an interval so in-flight progress keeps moving. */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const formatRemaining = (ms: number) => {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 1) return 'landing now';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `lands in ${h}h ${m}m` : `lands in ${m}m`;
};

function InFlightCard({ booking, now }: { booking: Booking; now: number }) {
  const { flight } = booking;
  const { route } = flight;
  const departure = new Date(flight.departureTime).getTime();
  const arrival = new Date(flight.arrivalTime).getTime();
  const progress = Math.min(Math.max((now - departure) / (arrival - departure), 0), 1);

  const hasPath =
    route.originAirport.latitude != null && route.destinationAirport.latitude != null;

  // Context dots for the map; only fetched while something is in the air
  const { data: airports = [] } = useQuery({
    queryKey: ['airports'],
    queryFn: flightApi.airports,
    staleTime: Infinity,
    enabled: hasPath,
  });

  return (
    <Link
      to={`/bookings/${booking.id}`}
      className="group block bg-white rounded-3xl border border-slate-200/80 shadow-soft hover:shadow-lift hover:border-brand-200 transition-all overflow-hidden animate-fade-up"
    >
      <div className="p-5 sm:p-6 pb-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
            </span>
            Live · in flight
          </span>
          <span className="text-xs font-semibold text-ink-soft">
            {flight.airline.name} · {flight.flightNumber}
          </span>
          <span className="ml-auto text-xs font-bold text-brand-700 tabular-nums">
            {booking.bookingReference}
          </span>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="shrink-0">
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {route.originAirport.iataCode}
            </p>
            <p className="text-xs font-medium text-ink-soft truncate max-w-24">
              {route.originAirport.city}
            </p>
            <p className="text-sm font-bold tabular-nums mt-0.5">
              {formatTime(flight.departureTime)}
            </p>
          </div>

          {/* Progress track */}
          <div className="flex-1 min-w-0">
            <div className="relative h-1.5 rounded-full bg-slate-100">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-600 to-violet-glow"
                style={{ width: `${progress * 100}%` }}
              />
              <span
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white border border-brand-200 shadow-soft flex items-center justify-center"
                style={{ left: `${progress * 100}%` }}
              >
                <PlaneIcon className="w-3.5 h-3.5 text-brand-600" />
              </span>
            </div>
            <p className="text-center text-[11px] font-bold text-ink-soft mt-3 tabular-nums">
              {Math.round(progress * 100)}% · {formatRemaining(arrival - now)}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {route.destinationAirport.iataCode}
            </p>
            <p className="text-xs font-medium text-ink-soft truncate max-w-24 ml-auto">
              {route.destinationAirport.city}
            </p>
            <p className="text-sm font-bold tabular-nums mt-0.5">
              {formatTime(flight.arrivalTime)}
            </p>
          </div>
        </div>
      </div>

      {hasPath && (
        <div className="px-5 sm:px-6 pb-5 sm:pb-6">
          <div className="[&_svg]:w-full [&_svg]:h-auto rounded-xl overflow-hidden border border-slate-200/70">
            <FlightPathMap
              airports={airports}
              origin={route.originAirport}
              destination={route.destinationAirport}
              progress={progress}
            />
          </div>
        </div>
      )}
    </Link>
  );
}

function NextTripCard({ booking }: { booking: Booking }) {
  const { flight } = booking;
  return (
    <Link
      to={`/bookings/${booking.id}`}
      className="group relative block overflow-hidden rounded-3xl bg-brand-950 text-white shadow-lift hover:shadow-xl transition-shadow"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(500px 240px at 10% -10%, rgb(37 99 235 / 0.55), transparent 60%), radial-gradient(420px 220px at 90% 10%, rgb(124 58 237 / 0.5), transparent 60%)',
        }}
      />
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-200 bg-white/10 border border-white/15 rounded-full px-3 py-1.5">
            <PlaneIcon className="w-3.5 h-3.5 -rotate-45" />
            Next trip · {daysUntil(flight.departureTime)}
          </span>
          {booking.status === 'PENDING' && (
            <span className="inline-flex items-center text-[11px] font-bold uppercase tracking-wide bg-amber-400/20 border border-amber-300/40 text-amber-200 rounded-full px-3 py-1.5">
              ⏳ payment pending
            </span>
          )}
          <span className="ml-auto text-xs font-bold text-brand-200 tabular-nums">
            {booking.bookingReference}
          </span>
        </div>

        <div className="flex items-center gap-4 sm:gap-8">
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {flight.route.originAirport.iataCode}
            </p>
            <p className="text-sm font-medium text-brand-100/90">
              {flight.route.originAirport.city}
            </p>
            <p className="text-lg font-bold tabular-nums mt-1">
              {formatTime(flight.departureTime)}
            </p>
          </div>
          <div className="flex-1 flex flex-col items-center px-1">
            <div className="w-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-300" />
              <span className="flex-1 border-t-2 border-dotted border-white/30" />
              <PlaneIcon className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
              <span className="flex-1 border-t-2 border-dotted border-white/30" />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-300" />
            </div>
            <p className="text-[11px] font-semibold text-brand-100/80 mt-2">
              {flight.airline.name} · {flight.flightNumber} · {formatDate(flight.departureTime)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {flight.route.destinationAirport.iataCode}
            </p>
            <p className="text-sm font-medium text-brand-100/90">
              {flight.route.destinationAirport.city}
            </p>
            <p className="text-lg font-bold tabular-nums mt-1">{formatTime(flight.arrivalTime)}</p>
          </div>
        </div>

        <p className="mt-6 text-xs font-semibold text-brand-100/80">
          {booking.passengers.length}{' '}
          {booking.passengers.length === 1 ? 'passenger' : 'passengers'} · seats{' '}
          {booking.passengers.map((p) => p.seat?.seatNumber ?? '—').join(', ')}
          {flight.terminal && ` · Terminal ${flight.terminal}`}
          {flight.gate && ` · Gate ${flight.gate}`}
        </p>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);

  const { data: bookings } = useQuery({ queryKey: ['bookings'], queryFn: bookingApi.listMine });

  // Tick every 30s so live flight progress advances without a refresh
  const now = useNow(30_000);
  const inFlight = (bookings ?? [])
    .filter((b) => isInFlight(b, now))
    // one card per flight even if the user holds several bookings on it
    .filter((b, i, all) => all.findIndex((o) => o.flight.id === b.flight.id) === i)
    .sort(
      (a, b) =>
        new Date(a.flight.arrivalTime).getTime() - new Date(b.flight.arrivalTime).getTime()
    );

  const upcoming = (bookings ?? [])
    .filter(isUpcoming)
    .sort(
      (a, b) =>
        new Date(a.flight.departureTime).getTime() - new Date(b.flight.departureTime).getTime()
    );
  const nextTrip = upcoming[0];
  const totalSpent = (bookings ?? [])
    .filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
    .reduce((sum, b) => sum + Number(b.totalAmount), 0);
  const recent = (bookings ?? []).slice(0, 3);

  const stats = [
    { label: 'Upcoming trips', value: upcoming.length },
    { label: 'Total bookings', value: bookings?.length ?? 0 },
    { label: 'Total spent', value: `₱${totalSpent.toLocaleString()}` },
  ];

  const cards = [
    {
      to: '/flights',
      icon: SearchIcon,
      title: 'Search flights',
      text: 'Find and book your next trip',
      live: true,
      gradient: 'from-brand-600 to-violet-glow',
    },
    {
      to: '/bookings',
      icon: TicketIcon,
      title: 'My bookings',
      text: 'Tickets, receipts and trip history',
      live: true,
      gradient: 'from-sky-500 to-brand-600',
    },
    {
      to: '/check-in',
      icon: CheckInIcon,
      title: 'Online check-in',
      text: 'Skip the counter, get your boarding pass',
      live: true,
      gradient: 'from-violet-glow to-fuchsia-500',
    },
  ];

  return (
    <div className="animate-fade-up space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-ink-soft mb-2">{today}</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Hello,{' '}
          <span className="bg-gradient-to-r from-brand-600 to-violet-glow bg-clip-text text-transparent">
            {user?.firstName}
          </span>
        </h1>
        <p className="text-ink-soft font-medium mt-2">
          Signed in as <span className="font-bold text-ink">{user?.email}</span>
          <span className="ml-2 inline-flex px-2 py-0.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-[11px] font-bold capitalize">
            {user?.role.toLowerCase().replace(/_/g, ' ')}
          </span>
        </p>
      </div>

      {inFlight.map((b) => (
        <InFlightCard key={b.id} booking={b} now={now} />
      ))}

      {nextTrip ? (
        <NextTripCard booking={nextTrip} />
      ) : inFlight.length > 0 ? null : (
        <Link
          to="/flights"
          className="group block rounded-3xl border-2 border-dashed border-slate-200 bg-white/60 p-8 text-center hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
        >
          <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <GlobeIcon className="w-7 h-7" />
          </div>
          <p className="font-extrabold text-ink">No upcoming trips</p>
          <p className="text-sm font-medium text-ink-soft mt-1">
            Where to next? Search flights and lock in your favorite seat.
          </p>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-4 sm:p-5"
          >
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-ink-soft">
              {s.label}
            </p>
            <p className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums mt-1">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(({ to, icon: Icon, title, text, live, gradient }) => {
          const inner = (
            <>
              <span
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center mb-4 ${
                  live ? 'group-hover:scale-110 transition-transform' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </span>
              <p className="font-extrabold text-ink flex items-center gap-2">
                {title}
                {!live && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-ink-soft text-[10px] font-bold uppercase tracking-wide">
                    Soon
                  </span>
                )}
              </p>
              <p className="text-sm font-medium text-ink-soft mt-1">{text}</p>
            </>
          );

          return live && to ? (
            <Link
              key={title}
              to={to}
              className="group bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 hover:shadow-lift hover:border-brand-200 hover:-translate-y-0.5 transition-all duration-300"
            >
              {inner}
            </Link>
          ) : (
            <div
              key={title}
              className="bg-white/60 rounded-2xl border border-slate-200/60 p-6 opacity-70"
            >
              {inner}
            </div>
          );
        })}
      </div>

      {/* Recent bookings */}
      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold tracking-tight">Recent bookings</h2>
            <Link to="/bookings" className="text-sm font-bold text-brand-600 hover:underline">
              View all →
            </Link>
          </div>
          <ul className="space-y-3">
            {recent.map((b) => (
              <li key={b.id}>
                <Link
                  to={`/bookings/${b.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-white rounded-2xl border border-slate-200/80 shadow-soft px-5 py-4 hover:shadow-lift hover:border-brand-200 transition-all"
                >
                  <span className="text-sm font-extrabold tabular-nums text-brand-700">
                    {b.bookingReference}
                  </span>
                  <span className="text-sm font-semibold text-ink flex-1 min-w-0 truncate">
                    {b.flight.route.originAirport.city} → {b.flight.route.destinationAirport.city}
                    <span className="text-ink-soft font-medium">
                      {' '}
                      · {formatDate(b.flight.departureTime)}
                    </span>
                  </span>
                  <span className="text-sm font-bold tabular-nums">
                    ₱{Number(b.totalAmount).toLocaleString()}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full border text-[11px] font-bold capitalize ${statusChip[b.status]}`}
                  >
                    {b.status.toLowerCase()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
