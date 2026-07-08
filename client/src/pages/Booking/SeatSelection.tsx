import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { seatApi, type SeatMapSeat } from '../../features/seat/api';
import { useSeatSocket } from '../../hooks/useSeatSocket';
import SeatMap from '../../components/seatmap/SeatMap';
import { ClockIcon, PlaneIcon } from '../../components/ui/icons';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

function LockCountdown({ expiresAt, onExpire }: { expiresAt: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.max(0, expiresAt - Date.now());
      setRemaining(left);
      if (left <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const urgent = remaining < 60000;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-bold tabular-nums ${
        urgent ? 'text-red-600' : 'text-brand-800'
      }`}
    >
      <ClockIcon className="w-4 h-4" />
      {minutes}:{String(seconds).padStart(2, '0')}
    </span>
  );
}

export default function SeatSelection() {
  const { flightId } = useParams<{ flightId: string }>();
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
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start animate-fade-up">
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

      <aside className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 lg:sticky lg:top-24">
        <h2 className="font-extrabold tracking-tight mb-5">Your selection</h2>

        {mySeats.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center">
            <p className="text-2xl mb-2">💺</p>
            <p className="text-sm font-medium text-ink-soft leading-relaxed">
              Tap an available seat to hold it. Held seats are reserved for you for{' '}
              <span className="font-bold text-ink">5 minutes</span>.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm mb-5 p-3.5 rounded-xl bg-brand-50 border border-brand-100 text-brand-800 font-semibold">
              <span>Seats held for</span>
              {earliestExpiry && (
                <LockCountdown expiresAt={earliestExpiry} onExpire={invalidate} />
              )}
            </div>
            <ul className="space-y-3 mb-5">
              {mySeats.map((seat) => (
                <li key={seat.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-violet-glow text-white text-[11px] font-bold flex items-center justify-center">
                      {seat.seatNumber}
                    </span>
                    <span className="font-semibold text-ink capitalize">
                      {seat.cabinClass === 'BUSINESS' ? 'Business' : 'Economy'}
                      <span className="block text-[11px] font-medium text-ink-soft">
                        {seat.seatType.toLowerCase()} seat
                      </span>
                    </span>
                  </span>
                  <span className="font-bold text-ink">
                    {Number(seat.extraPrice) > 0 ? `+₱${Number(seat.extraPrice)}` : 'Free'}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-sm font-extrabold mb-5">
              <span>Seat fees</span>
              <span className="tabular-nums">₱{seatFees.toLocaleString()}</span>
            </div>
          </>
        )}

        <button
          disabled={mySeats.length === 0}
          className="w-full h-12 mt-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title="Passenger details — next module"
        >
          Continue to passenger details
        </button>
        <p className="text-[11px] font-medium text-ink-soft mt-2.5 text-center">
          Booking flow coming in the next module
        </p>
      </aside>
    </div>
  );
}
