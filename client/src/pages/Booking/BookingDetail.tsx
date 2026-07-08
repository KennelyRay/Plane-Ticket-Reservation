import { Link, useLocation, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { bookingApi, type BookingStatus } from '../../features/booking/api';
import { PlaneIcon, TicketIcon } from '../../components/ui/icons';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

export const statusChip: Record<BookingStatus, string> = {
  CONFIRMED: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  PENDING: 'bg-amber-50 border-amber-200 text-amber-700',
  CANCELLED: 'bg-red-50 border-red-200 text-red-600',
  EXPIRED: 'bg-slate-100 border-slate-200 text-slate-500',
  COMPLETED: 'bg-sky-50 border-sky-200 text-sky-700',
};

export default function BookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();
  const justBooked = Boolean((location.state as { justBooked?: boolean } | null)?.justBooked);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const { data: booking, isLoading, isError } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingApi.get(bookingId!),
    enabled: !!bookingId,
  });

  const cancelMutation = useMutation({
    mutationFn: () => bookingApi.cancel(bookingId!),
    onSuccess: (updated) => {
      queryClient.setQueryData(['booking', bookingId], updated);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['seatmap', updated.flight.id] });
    },
    onError: (err) => {
      setCancelError(
        isAxiosError(err)
          ? err.response?.data?.message ?? 'Could not cancel the booking'
          : 'Could not cancel the booking'
      );
    },
  });

  if (isLoading)
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center animate-pulse">
        <p className="text-sm font-semibold text-ink-soft">Loading booking…</p>
      </div>
    );

  if (isError || !booking)
    return (
      <div className="bg-white rounded-2xl border border-red-100 p-12 text-center">
        <p className="text-3xl mb-2">🎫</p>
        <p className="font-bold">Booking not found</p>
        <Link to="/bookings" className="text-sm font-bold text-brand-600 hover:underline mt-2 inline-block">
          ← Back to my bookings
        </Link>
      </div>
    );

  const { flight } = booking;
  const departed = new Date(flight.departureTime) <= new Date();
  const cancellable =
    (booking.status === 'CONFIRMED' || booking.status === 'PENDING') && !departed;

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl mx-auto">
      <Link
        to="/bookings"
        className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:underline"
      >
        ← My bookings
      </Link>

      {justBooked && booking.status === 'CONFIRMED' && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold animate-fade-in">
          🎉 Booking confirmed! Your reference is{' '}
          <span className="font-extrabold">{booking.bookingReference}</span> — keep it handy for
          check-in.
        </div>
      )}

      {cancelError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium animate-fade-in">
          {cancelError}
        </div>
      )}

      {/* Reference header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 sm:p-6 flex flex-wrap items-center gap-4">
        <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-violet-glow text-white flex items-center justify-center">
          <TicketIcon className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">
            Booking reference
          </p>
          <p className="text-2xl font-extrabold tracking-tight tabular-nums">
            {booking.bookingReference}
          </p>
        </div>
        <span
          className={`px-3 py-1.5 rounded-full border text-xs font-bold capitalize ${statusChip[booking.status]}`}
        >
          {booking.status.toLowerCase()}
        </span>
      </div>

      {/* Flight summary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-violet-glow text-white flex items-center justify-center">
            <PlaneIcon className="w-4.5 h-4.5 -rotate-45" />
          </span>
          <div>
            <p className="font-extrabold tracking-tight">
              {flight.route.originAirport.city} → {flight.route.destinationAirport.city}
            </p>
            <p className="text-xs font-semibold text-ink-soft">
              {flight.airline.name} · {flight.flightNumber} · {formatDate(flight.departureTime)}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="font-extrabold tabular-nums">
              {formatTime(flight.departureTime)} – {formatTime(flight.arrivalTime)}
            </p>
            <p className="text-xs font-semibold text-ink-soft">
              {flight.route.originAirport.iataCode} → {flight.route.destinationAirport.iataCode}
              {flight.terminal && ` · Terminal ${flight.terminal}`}
              {flight.gate && ` · Gate ${flight.gate}`}
            </p>
          </div>
        </div>
      </div>

      {/* Passengers */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 sm:p-6">
        <h2 className="font-extrabold tracking-tight mb-4">Passengers</h2>
        <ul className="divide-y divide-slate-100">
          {booking.passengers.map((bp) => (
            <li key={bp.id} className="py-3 flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-600 to-violet-glow text-white text-[11px] font-bold flex items-center justify-center">
                {bp.seat?.seatNumber ?? '—'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink">
                  {bp.passenger.firstName} {bp.passenger.lastName}
                </p>
                <p className="text-xs font-medium text-ink-soft capitalize">
                  {bp.cabinClass === 'BUSINESS' ? 'Business' : 'Economy'}
                  {bp.seat && ` · ${bp.seat.seatType.toLowerCase()}`} · {bp.passenger.nationality}
                </p>
              </div>
              <span className="text-sm font-extrabold tabular-nums">
                ₱{Number(bp.fareAmount).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-slate-100 mt-2 pt-4 flex items-center justify-between">
          <span className="text-sm font-extrabold">Total paid</span>
          <span className="text-xl font-extrabold tabular-nums">
            ₱{Number(booking.totalAmount).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Contact + actions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 sm:p-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Contact</p>
          <p className="text-sm font-semibold text-ink">
            {booking.contactEmail}
            {booking.contactPhone && ` · ${booking.contactPhone}`}
          </p>
          <p className="text-xs font-medium text-ink-soft mt-0.5">
            Booked {formatDate(booking.createdAt)}
          </p>
        </div>
        {cancellable && (
          <button
            onClick={() => {
              if (window.confirm('Cancel this booking? The seats will be released.'))
                cancelMutation.mutate();
            }}
            disabled={cancelMutation.isPending}
            className="h-11 px-5 rounded-xl text-sm font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {cancelMutation.isPending ? 'Cancelling…' : 'Cancel booking'}
          </button>
        )}
      </div>
    </div>
  );
}
