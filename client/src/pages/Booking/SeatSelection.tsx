import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { seatApi, type SeatMapSeat } from '../../features/seat/api';
import { useSeatSocket } from '../../hooks/useSeatSocket';
import SeatMap from '../../components/seatmap/SeatMap';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
    <span className={`font-mono font-bold ${urgent ? 'text-red-600' : 'text-slate-700'}`}>
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

  if (isLoading) return <p className="text-slate-500">Loading seat map…</p>;
  if (isError || !data)
    return <p className="text-red-600">Could not load the seat map. Is the server running?</p>;

  const { flight } = data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
      <div>
        <Link to="/flights" className="text-sm text-sky-600 hover:underline">
          ← Back to flights
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 mt-2 mb-1">Choose your seats</h1>
        <p className="text-sm text-slate-500 mb-6">
          {flight.airline.name} {flight.flightNumber} · {flight.route.originAirport.iataCode} →{' '}
          {flight.route.destinationAirport.iataCode} · {formatTime(flight.departureTime)}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        <SeatMap seats={data.seats} onSeatClick={handleSeatClick} busySeatId={busySeatId} />
      </div>

      <aside className="bg-white rounded-2xl border border-slate-200 p-6 lg:sticky lg:top-24">
        <h2 className="font-semibold text-slate-800 mb-4">Your selection</h2>

        {mySeats.length === 0 ? (
          <p className="text-sm text-slate-400">
            Tap an available seat to hold it. Held seats are reserved for you for 5 minutes.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm mb-4 p-3 rounded-lg bg-sky-50 text-sky-800">
              <span>Seats held for</span>
              {earliestExpiry && (
                <LockCountdown expiresAt={earliestExpiry} onExpire={invalidate} />
              )}
            </div>
            <ul className="space-y-2 mb-4">
              {mySeats.map((seat) => (
                <li key={seat.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">
                    Seat {seat.seatNumber}
                    <span className="text-slate-400 font-normal">
                      {' '}
                      · {seat.cabinClass === 'BUSINESS' ? 'Business' : 'Economy'} ·{' '}
                      {seat.seatType.toLowerCase()}
                    </span>
                  </span>
                  <span className="text-slate-600">
                    {Number(seat.extraPrice) > 0 ? `+₱${Number(seat.extraPrice)}` : 'Free'}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-sm font-semibold text-slate-800 mb-4">
              <span>Seat fees</span>
              <span>₱{seatFees.toLocaleString()}</span>
            </div>
          </>
        )}

        <button
          disabled={mySeats.length === 0}
          className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          title="Passenger details — next module"
        >
          Continue to passenger details
        </button>
        <p className="text-[11px] text-slate-400 mt-2 text-center">
          Booking flow coming in the next module
        </p>
      </aside>
    </div>
  );
}
