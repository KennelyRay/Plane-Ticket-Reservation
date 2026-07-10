import { Link, useLocation, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { bookingApi, type BookingStatus } from '../../features/booking/api';
import { readReturnLeg, clearReturnLeg } from '../../features/booking/returnLeg';
import LockCountdown from '../../components/booking/LockCountdown';
import BoardingPassCard from '../../components/booking/BoardingPassCard';
import SuccessModal from '../../components/ui/SuccessModal';
import { printBoardingPasses } from '../../features/booking/printBoardingPass';
import { CheckIcon, CheckInIcon, MailIcon, PlaneIcon, PrinterIcon, TicketIcon } from '../../components/ui/icons';

const CHECKIN_OPENS_HOURS_BEFORE = 24;

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
  const justPaid = Boolean((location.state as { justPaid?: boolean } | null)?.justPaid);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showConfirmedModal, setShowConfirmedModal] = useState(justPaid);
  const [emailedTo, setEmailedTo] = useState<string | null>(null);

  const { data: booking, isLoading, isError } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingApi.get(bookingId!),
    enabled: !!bookingId,
  });

  const checkinMutation = useMutation({
    mutationFn: () => bookingApi.checkIn(bookingId!),
    onSuccess: (updated) => {
      queryClient.setQueryData(['booking', bookingId], updated);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err) => {
      setCancelError(
        isAxiosError(err)
          ? err.response?.data?.message ?? 'Check-in failed'
          : 'Check-in failed'
      );
    },
  });

  const emailMutation = useMutation({
    mutationFn: () => bookingApi.emailBoardingPass(bookingId!),
    onSuccess: ({ email }) => {
      setCancelError(null);
      setEmailedTo(email);
    },
    onError: (err) => {
      setCancelError(
        isAxiosError(err)
          ? err.response?.data?.message ?? 'Could not email the boarding pass'
          : 'Could not email the boarding pass'
      );
    },
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
        <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-slate-100 text-ink-soft flex items-center justify-center">
          <TicketIcon className="w-7 h-7" />
        </div>
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

  const returnLeg = readReturnLeg();
  const offerReturn =
    justPaid && booking.status === 'CONFIRMED' && returnLeg?.outboundFlightId === flight.id;

  const checkedIn = booking.passengers.every((p) => p.ticket?.status === 'CHECKED_IN');
  const checkinOpensAt = new Date(
    new Date(flight.departureTime).getTime() - CHECKIN_OPENS_HOURS_BEFORE * 60 * 60 * 1000
  );
  const checkinOpen = new Date() >= checkinOpensAt && !departed;
  const canCheckIn = booking.status === 'CONFIRMED' && !checkedIn && !departed;

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl mx-auto">
      <SuccessModal
        open={showConfirmedModal && booking.status === 'CONFIRMED'}
        onClose={() => setShowConfirmedModal(false)}
        title="Booking confirmed!"
        message={
          <>
            Payment received — you're all set for{' '}
            <span className="font-bold text-ink">
              {flight.route.originAirport.city} → {flight.route.destinationAirport.city}
            </span>
            . Your reference is{' '}
            <span className="font-extrabold text-ink tabular-nums">
              {booking.bookingReference}
            </span>{' '}
            — keep it handy for check-in.
          </>
        }
      >
        {offerReturn && returnLeg && (
          <Link
            to={`/flights?origin=${returnLeg.origin}&destination=${returnLeg.destination}&date=${returnLeg.date}&trip=one&sort=departure&page=1`}
            onClick={clearReturnLeg}
            className="w-full h-11 rounded-xl inline-flex items-center justify-center text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 transition-all"
          >
            Book your return flight →
          </Link>
        )}
        <button
          onClick={() => setShowConfirmedModal(false)}
          className={`w-full h-11 rounded-xl text-sm font-bold transition-all ${
            offerReturn && returnLeg
              ? 'text-ink-soft border border-slate-200 hover:border-brand-300 hover:text-brand-700'
              : 'text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.99]'
          }`}
        >
          View my booking
        </button>
      </SuccessModal>

      <SuccessModal
        open={emailedTo !== null}
        onClose={() => setEmailedTo(null)}
        tone="brand"
        title="E-boarding pass sent!"
        message={
          <>
            Your e-boarding pass has been sent to your email
            {emailedTo && (
              <>
                {' '}
                — <span className="font-bold text-ink">{emailedTo}</span>
              </>
            )}
            . Check your inbox before heading to the airport.
          </>
        }
      >
        <button
          onClick={() => setEmailedTo(null)}
          className="w-full h-11 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.99] transition-all"
        >
          Done
        </button>
      </SuccessModal>

      <Link
        to="/bookings"
        className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:underline"
      >
        ← My bookings
      </Link>

      {justPaid && booking.status === 'CONFIRMED' && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold animate-fade-in flex items-start gap-2.5">
          <span className="w-5 h-5 shrink-0 rounded-full bg-emerald-500 text-white flex items-center justify-center mt-0.5">
            <CheckIcon className="w-3 h-3" />
          </span>
          <span>
            Payment successful — booking confirmed! Your reference is{' '}
            <span className="font-extrabold">{booking.bookingReference}</span> — keep it handy for
            check-in.
          </span>
        </div>
      )}

      {offerReturn && returnLeg && (
        <div className="p-4 rounded-2xl bg-brand-50 border border-brand-100 text-brand-800 text-sm font-semibold animate-fade-in flex flex-wrap items-center gap-3">
          <PlaneIcon className="w-4 h-4 -rotate-45 text-brand-600 shrink-0" />
          <span className="flex-1 min-w-0">
            Outbound booked! Now grab your return flight — {returnLeg.origin} →{' '}
            {returnLeg.destination} on{' '}
            {new Date(returnLeg.date).toLocaleDateString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
            .
          </span>
          <Link
            to={`/flights?origin=${returnLeg.origin}&destination=${returnLeg.destination}&date=${returnLeg.date}&trip=one&sort=departure&page=1`}
            onClick={clearReturnLeg}
            className="h-10 px-5 inline-flex items-center rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift transition-all shrink-0"
          >
            Book return flight →
          </Link>
        </div>
      )}

      {booking.status === 'PENDING' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold animate-fade-in flex flex-wrap items-center gap-3">
          <span className="flex-1 min-w-0">
            ⏳ Payment pending — your seats are held
            {booking.expiresAt && (
              <>
                {' '}
                for{' '}
                <LockCountdown
                  expiresAt={new Date(booking.expiresAt).getTime()}
                  onExpire={() =>
                    queryClient.invalidateQueries({ queryKey: ['booking', bookingId] })
                  }
                />
              </>
            )}
          </span>
          <Link
            to={`/bookings/${booking.id}/pay`}
            className="h-10 px-5 inline-flex items-center rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift transition-all shrink-0"
          >
            Complete payment
          </Link>
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
                  {bp.passenger.title ? `${bp.passenger.title} ` : ''}
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
          <span className="text-sm font-extrabold">
            {booking.status === 'PENDING' ? 'Total due' : 'Total'}
          </span>
          <span className="text-xl font-extrabold tabular-nums">
            ₱{Number(booking.totalAmount).toLocaleString()}
          </span>
        </div>
        {booking.payments.some((p) => p.status === 'PAID') && (
          <p className="text-xs font-medium text-ink-soft mt-2">
            Paid via{' '}
            {booking.payments
              .filter((p) => p.status === 'PAID')
              .map((p) => `${p.method === 'CARD' ? 'card' : p.method === 'GCASH' ? 'GCash' : 'Maya'} · ref ${p.transactionId}`)
              .join(', ')}
          </p>
        )}
      </div>

      {/* Online check-in */}
      {booking.status === 'CONFIRMED' && !departed && (
        <div className="space-y-4">
          {checkedIn ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-extrabold tracking-tight flex items-center gap-2">
                  <CheckInIcon className="w-4 h-4 text-emerald-500" />
                  Boarding passes
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => printBoardingPasses(booking)}
                    className="h-10 px-4 inline-flex items-center gap-2 rounded-xl text-sm font-bold text-ink border border-slate-200 bg-white hover:border-brand-300 hover:text-brand-700 transition-colors"
                  >
                    <PrinterIcon className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={() => emailMutation.mutate()}
                    disabled={emailMutation.isPending}
                    className="h-10 px-4 inline-flex items-center gap-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    <MailIcon className="w-4 h-4" />
                    {emailMutation.isPending ? 'Sending…' : 'Email boarding pass'}
                  </button>
                </div>
              </div>
              {booking.passengers
                .filter((bp) => bp.ticket?.boardingPass)
                .map((bp) => (
                  <BoardingPassCard key={bp.id} booking={booking} bp={bp} />
                ))}
            </>
          ) : canCheckIn ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 sm:p-6 flex flex-wrap items-center gap-4">
              <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-glow to-fuchsia-500 text-white flex items-center justify-center">
                <CheckInIcon className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold tracking-tight">Online check-in</p>
                <p className="text-xs font-medium text-ink-soft mt-0.5">
                  {checkinOpen
                    ? 'Check in now and skip the counter — boarding passes are issued instantly.'
                    : `Opens ${checkinOpensAt.toLocaleString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })} (24h before departure).`}
                </p>
              </div>
              <button
                onClick={() => checkinMutation.mutate()}
                disabled={!checkinOpen || checkinMutation.isPending}
                className="h-11 px-6 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {checkinMutation.isPending ? 'Checking in…' : 'Check in now'}
              </button>
            </div>
          ) : null}
        </div>
      )}

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
