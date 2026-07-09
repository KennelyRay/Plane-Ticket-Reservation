import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bookingApi } from '../../features/booking/api';
import { statusChip } from './BookingDetail';
import { AlertIcon, LuggageIcon, PlaneIcon } from '../../components/ui/icons';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

export default function MyBookings() {
  const { data: bookings, isLoading, isError } = useQuery({
    queryKey: ['bookings'],
    queryFn: bookingApi.listMine,
  });

  if (isLoading)
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center animate-pulse">
        <p className="text-sm font-semibold text-ink-soft">Loading your bookings…</p>
      </div>
    );

  if (isError || !bookings)
    return (
      <div className="bg-white rounded-2xl border border-red-100 p-12 text-center">
        <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
          <AlertIcon className="w-7 h-7" />
        </div>
        <p className="font-bold">Could not load your bookings</p>
        <p className="text-sm text-ink-soft mt-1">Please try again in a moment.</p>
      </div>
    );

  return (
    <div className="animate-fade-up max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">My bookings</h1>
      <p className="text-sm font-medium text-ink-soft mb-8">
        Your trips, receipts and booking history.
      </p>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <LuggageIcon className="w-8 h-8" />
          </div>
          <p className="text-lg font-bold text-ink">No trips yet</p>
          <p className="text-sm text-ink-soft mt-1 mb-6">
            Book your first flight and it will show up here.
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
          {bookings.map((booking) => (
            <li key={booking.id}>
              <Link
                to={`/bookings/${booking.id}`}
                className="group block bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 sm:p-6 hover:shadow-lift hover:border-brand-200 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-violet-glow text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                    <PlaneIcon className="w-4.5 h-4.5 -rotate-45" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold tracking-tight">
                      {booking.flight.route.originAirport.city} →{' '}
                      {booking.flight.route.destinationAirport.city}
                    </p>
                    <p className="text-xs font-semibold text-ink-soft">
                      {booking.flight.airline.name} · {booking.flight.flightNumber} ·{' '}
                      {formatDate(booking.flight.departureTime)} ·{' '}
                      {formatTime(booking.flight.departureTime)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold tabular-nums">{booking.bookingReference}</p>
                    <p className="text-xs font-semibold text-ink-soft">
                      {booking.passengers.length}{' '}
                      {booking.passengers.length === 1 ? 'passenger' : 'passengers'} · ₱
                      {Number(booking.totalAmount).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-full border text-xs font-bold capitalize ${statusChip[booking.status]}`}
                  >
                    {booking.status.toLowerCase()}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
