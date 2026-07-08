import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bookingApi, type Booking } from '../../features/booking/api';
import { CheckInIcon } from '../../components/ui/icons';

const CHECKIN_OPENS_HOURS_BEFORE = 24;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

type CheckinState = 'checked-in' | 'open' | 'not-yet';

const checkinState = (b: Booking): CheckinState => {
  if (b.passengers.every((p) => p.ticket?.status === 'CHECKED_IN')) return 'checked-in';
  const opensAt =
    new Date(b.flight.departureTime).getTime() - CHECKIN_OPENS_HOURS_BEFORE * 60 * 60 * 1000;
  return Date.now() >= opensAt ? 'open' : 'not-yet';
};

const stateChip: Record<CheckinState, { label: string; cls: string }> = {
  'checked-in': { label: 'Checked in', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  open: { label: 'Check-in open', cls: 'bg-brand-50 border-brand-200 text-brand-700' },
  'not-yet': { label: 'Opens 24h before', cls: 'bg-slate-100 border-slate-200 text-slate-500' },
};

export default function CheckIn() {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: bookingApi.listMine,
  });

  const eligible = (bookings ?? []).filter(
    (b) => b.status === 'CONFIRMED' && new Date(b.flight.departureTime) > new Date()
  );

  if (isLoading)
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center animate-pulse">
        <p className="text-sm font-semibold text-ink-soft">Loading your flights…</p>
      </div>
    );

  return (
    <div className="animate-fade-up max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-glow to-fuchsia-500 text-white flex items-center justify-center">
          <CheckInIcon className="w-5 h-5" />
        </span>
        Online check-in
      </h1>
      <p className="text-sm font-medium text-ink-soft mb-8">
        Check in from {CHECKIN_OPENS_HOURS_BEFORE} hours before departure and get your boarding
        passes instantly.
      </p>

      {eligible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <p className="text-4xl mb-3">🛄</p>
          <p className="text-lg font-bold text-ink">No upcoming flights to check in</p>
          <p className="text-sm text-ink-soft mt-1 mb-6">
            Confirmed bookings appear here once you have a trip coming up.
          </p>
          <Link
            to="/flights"
            className="inline-flex h-11 px-6 items-center rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift transition-all"
          >
            Search flights
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {eligible.map((b) => {
            const state = checkinState(b);
            const chip = stateChip[state];
            return (
              <li key={b.id}>
                <Link
                  to={`/bookings/${b.id}`}
                  className="group block bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 sm:p-6 hover:shadow-lift hover:border-brand-200 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold tracking-tight">
                        {b.flight.route.originAirport.city} →{' '}
                        {b.flight.route.destinationAirport.city}
                      </p>
                      <p className="text-xs font-semibold text-ink-soft">
                        {b.flight.airline.name} · {b.flight.flightNumber} ·{' '}
                        {formatDateTime(b.flight.departureTime)} · {b.passengers.length}{' '}
                        {b.passengers.length === 1 ? 'passenger' : 'passengers'}
                      </p>
                    </div>
                    <span className="text-sm font-extrabold tabular-nums text-brand-700">
                      {b.bookingReference}
                    </span>
                    <span
                      className={`px-3 py-1.5 rounded-full border text-xs font-bold ${chip.cls}`}
                    >
                      {chip.label}
                    </span>
                    <span className="text-sm font-bold text-brand-600 group-hover:translate-x-0.5 transition-transform">
                      {state === 'checked-in' ? 'View passes →' : 'Open →'}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
