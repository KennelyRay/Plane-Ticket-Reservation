import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { seatApi, type SeatMapSeat } from '../../features/seat/api';
import { useSeatSocket } from '../../hooks/useSeatSocket';
import SeatMap from '../../components/seatmap/SeatMap';
import LockCountdown from '../../components/booking/LockCountdown';
import { PlaneIcon } from '../../components/ui/icons';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

export default function SeatSelection() {
  const { flightId } = useParams<{ flightId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  useSeatSocket(flightId);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['seatmap', flightId],
    queryFn: () => seatApi.getSeatMap(flightId!),
    enabled: !!flightId,
    refetchInterval: 30_000, // safety net on top of socket events
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['seatmap', flightId] });

  const lockMutation = useMutation({
    mutationFn: (seat: SeatMapSeat) => seatApi.lock(flightId!, seat.id),
    onSuccess: invalidate,
    onError: (err) => {
      setError(
        isAxiosError(err)
          ? err.response?.data?.message ?? 'Could not select seat'
          : 'Could not select seat'
      );
      invalidate();
    },
  });

  const releaseMutation = useMutation({
    mutationFn: (seat: SeatMapSeat) => seatApi.release(flightId!, seat.id),
    onSuccess: invalidate,
    onError: invalidate,
  });

  const handleSeatClick = (seat: SeatMapSeat) => {
    setError(null);
    if (seat.lockedByMe) releaseMutation.mutate(seat);
    else if (seat.status === 'AVAILABLE') lockMutation.mutate(seat);
  };

  const mySeats = useMemo(() => data?.seats.filter((s) => s.lockedByMe) ?? [], [data]);
  const seatFees = mySeats.reduce((sum, s) => sum + Number(s.extraPrice), 0);
  const earliestExpiry = mySeats.length
    ? Math.min(...mySeats.map((s) => s.lockExpiresAt ?? Infinity))
    : null;

  const busySeatId =
    (lockMutation.isPending && lockMutation.variables?.id) ||
    (releaseMutation.isPending && releaseMutation.variables?.id) ||
    null;

  if (isLoading)
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center animate-pulse">
        <p className="text-sm font-semibold text-ink-soft">Loading seat map…</p>
      </div>
    );

  if (isError || !data)
    return (
      <div className="bg-white rounded-2xl border border-red-100 p-12 text-center">
        <p className="text-3xl mb-2">🛰️</p>
        <p className="font-bold">Could not load the seat map</p>
        <p className="text-sm text-ink-soft mt-1">Please try again in a moment.</p>
      </div>
    );

  const { flight } = data;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <Link
          to="/flights"
          className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:underline"
        >
          ← Back to flights
        </Link>

        {/* Flight summary bar */}
        <div className="mt-3 mb-6 bg-white rounded-2xl border border-slate-200/80 shadow-soft p-4 sm:p-5 flex flex-wrap items-center gap-x-6 gap-y-2">
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
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium animate-fade-in">
            {error}
          </div>
        )}

        <SeatMap seats={data.seats} onSeatClick={handleSeatClick} busySeatId={busySeatId} />
      </div>

      <aside className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex-1 min-w-0">
            <h2 className="font-extrabold tracking-tight mb-3">Your selection</h2>
            {mySeats.length === 0 ? (
              <p className="text-sm font-medium text-ink-soft">
                💺 Tap an available seat to hold it — held seats are reserved for you for{' '}
                <span className="font-bold text-ink">5 minutes</span>.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2.5">
                {mySeats.map((seat) => (
                  <li
                    key={seat.id}
                    className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl border border-brand-100 bg-brand-50"
                  >
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-violet-glow text-white text-[11px] font-bold flex items-center justify-center">
                      {seat.seatNumber}
                    </span>
                    <span className="text-xs font-semibold text-ink capitalize leading-tight">
                      {seat.cabinClass === 'BUSINESS' ? 'Business' : 'Economy'}
                      <span className="block text-[10px] font-medium text-ink-soft">
                        {seat.seatType.toLowerCase()} ·{' '}
                        {Number(seat.extraPrice) > 0 ? `+₱${Number(seat.extraPrice)}` : 'free'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-5 lg:border-l lg:border-slate-100 lg:pl-6 shrink-0">
            {mySeats.length > 0 && earliestExpiry && (
              <div className="text-sm font-semibold text-brand-800 bg-brand-50 border border-brand-100 rounded-xl px-3.5 py-2.5">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                  Held for
                </span>
                <LockCountdown expiresAt={earliestExpiry} onExpire={invalidate} />
              </div>
            )}
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                Seat fees
              </p>
              <p className="text-xl font-extrabold tabular-nums">₱{seatFees.toLocaleString()}</p>
            </div>
            <button
              disabled={mySeats.length === 0}
              onClick={() => navigate(`/flights/${flightId}/passengers`)}
              className="h-12 px-6 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Continue to passenger details"
            >
              Continue
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
