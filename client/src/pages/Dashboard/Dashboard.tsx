import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../features/auth/store';
import { bookingApi, type Booking } from '../../features/booking/api';
import { statusChip } from '../Booking/BookingDetail';
import { CheckInIcon, PlaneIcon, SearchIcon, TicketIcon } from '../../components/ui/icons';

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
          </span>{' '}
          👋
        </h1>
        <p className="text-ink-soft font-medium mt-2">
          Signed in as <span className="font-bold text-ink">{user?.email}</span>
          <span className="ml-2 inline-flex px-2 py-0.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-[11px] font-bold capitalize">
            {user?.role.toLowerCase().replace(/_/g, ' ')}
          </span>
        </p>
      </div>

      {nextTrip ? (
        <NextTripCard booking={nextTrip} />
      ) : (
        <Link
          to="/flights"
          className="group block rounded-3xl border-2 border-dashed border-slate-200 bg-white/60 p-8 text-center hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
        >
          <p className="text-3xl mb-2">🌏</p>
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
