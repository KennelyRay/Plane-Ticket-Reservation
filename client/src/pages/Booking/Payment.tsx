import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { bookingApi, type PaymentMethod } from '../../features/booking/api';
import LockCountdown from '../../components/booking/LockCountdown';
import { ShieldIcon } from '../../components/ui/icons';

const inputClass =
  'w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-ink placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-400 transition-shadow';

const labelClass = 'block text-[11px] font-bold uppercase tracking-wide text-ink-soft mb-1.5';

const METHODS: { id: PaymentMethod; label: string; hint: string; badge: string }[] = [
  { id: 'CARD', label: 'Card', hint: 'Visa · Mastercard · JCB', badge: '💳' },
  { id: 'GCASH', label: 'GCash', hint: 'Pay with your GCash wallet', badge: '📱' },
  { id: 'PAYMAYA', label: 'Maya', hint: 'Pay with your Maya wallet', badge: '📲' },
];

const formatCardNumber = (v: string) =>
  v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');

const formatExpiry = (v: string) => {
  const digits = v.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

export default function Payment() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [method, setMethod] = useState<PaymentMethod>('CARD');
  const [card, setCard] = useState({ holder: '', number: '', expiry: '', cvv: '' });
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingApi.get(bookingId!),
    enabled: !!bookingId,
  });

  if (isLoading)
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center animate-pulse">
        <p className="text-sm font-semibold text-ink-soft">Loading payment…</p>
      </div>
    );

  if (!booking)
    return (
      <div className="bg-white rounded-2xl border border-red-100 p-12 text-center">
        <p className="text-3xl mb-2">🎫</p>
        <p className="font-bold">Booking not found</p>
        <Link to="/bookings" className="text-sm font-bold text-brand-600 hover:underline mt-2 inline-block">
          ← Back to my bookings
        </Link>
      </div>
    );

  // Only pending bookings can be paid — everything else falls through to the detail page
  if (booking.status !== 'PENDING') return <Navigate to={`/bookings/${booking.id}`} replace />;

  const { flight } = booking;
  const cardIncomplete =
    method === 'CARD' &&
    (!card.holder.trim() ||
      card.number.replace(/\s/g, '').length < 13 ||
      card.expiry.length < 5 ||
      card.cvv.length < 3);

  const handlePay = async () => {
    setError(null);
    setPaying(true);
    try {
      await bookingApi.pay({
        bookingId: booking.id,
        method,
        card: method === 'CARD' ? { ...card, number: card.number.replace(/\s/g, '') } : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      navigate(`/bookings/${booking.id}`, { replace: true, state: { justPaid: true } });
    } catch (err) {
      setError(
        isAxiosError(err)
          ? err.response?.data?.message ?? 'Payment failed — please try again'
          : 'Payment failed — please try again'
      );
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={`/bookings/${booking.id}`}
          className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:underline"
        >
          ← Booking {booking.bookingReference}
        </Link>
        {booking.expiresAt && (
          <span className="ml-auto inline-flex items-center gap-2 text-xs font-semibold text-ink-soft bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Complete payment within{' '}
            <LockCountdown
              expiresAt={new Date(booking.expiresAt).getTime()}
              onExpire={() => queryClient.invalidateQueries({ queryKey: ['booking', bookingId] })}
            />
          </span>
        )}
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Payment</h1>
        <p className="text-sm font-medium text-ink-soft mt-1">
          {flight.route.originAirport.city} → {flight.route.destinationAirport.city} ·{' '}
          {flight.airline.name} · {flight.flightNumber} · {booking.passengers.length}{' '}
          {booking.passengers.length === 1 ? 'passenger' : 'passengers'}
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium animate-fade-in">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
        {/* Method + form */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 sm:p-6">
          <h2 className="font-extrabold tracking-tight mb-4">Payment method</h2>

          <div className="grid grid-cols-3 gap-2.5 mb-6">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`rounded-xl border p-3 text-left transition-all ${
                  method === m.id
                    ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-500/30'
                    : 'border-slate-200 hover:border-brand-200'
                }`}
              >
                <span className="text-lg">{m.badge}</span>
                <p className="text-sm font-bold text-ink mt-1">{m.label}</p>
                <p className="text-[10px] font-medium text-ink-soft leading-tight">{m.hint}</p>
              </button>
            ))}
          </div>

          {method === 'CARD' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>Cardholder name</label>
                <input
                  value={card.holder}
                  onChange={(e) => setCard({ ...card, holder: e.target.value })}
                  className={inputClass}
                  placeholder="JUAN DELA CRUZ"
                  autoComplete="cc-name"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Card number</label>
                <input
                  value={card.number}
                  onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })}
                  className={`${inputClass} font-mono tabular-nums`}
                  placeholder="4242 4242 4242 4242"
                  inputMode="numeric"
                  autoComplete="cc-number"
                />
              </div>
              <div>
                <label className={labelClass}>Expiry</label>
                <input
                  value={card.expiry}
                  onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                  className={`${inputClass} font-mono tabular-nums`}
                  placeholder="MM/YY"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                />
              </div>
              <div>
                <label className={labelClass}>CVV</label>
                <input
                  value={card.cvv}
                  onChange={(e) =>
                    setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })
                  }
                  className={`${inputClass} font-mono tabular-nums`}
                  placeholder="123"
                  inputMode="numeric"
                  type="password"
                  autoComplete="cc-csc"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center">
              <p className="text-2xl mb-1">{METHODS.find((m) => m.id === method)?.badge}</p>
              <p className="text-sm font-semibold text-ink">
                You'll approve the payment in your {method === 'GCASH' ? 'GCash' : 'Maya'} app.
              </p>
              <p className="text-xs font-medium text-ink-soft mt-1">
                Demo environment — the payment settles instantly.
              </p>
            </div>
          )}

          <p className="mt-5 flex items-center gap-2 text-[11px] font-semibold text-ink-soft">
            <ShieldIcon className="w-3.5 h-3.5 text-emerald-500" />
            Demo checkout — no real charge is made. Cards ending in 0000 are declined.
          </p>
        </section>

        {/* Order summary */}
        <aside className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 className="font-extrabold tracking-tight mb-4">Summary</h2>
          <ul className="space-y-2.5 mb-4">
            {booking.passengers.map((bp) => (
              <li key={bp.id} className="flex items-center justify-between text-sm">
                <span className="font-semibold text-ink truncate">
                  {bp.passenger.firstName} {bp.passenger.lastName}
                  <span className="block text-[11px] font-medium text-ink-soft">
                    Seat {bp.seat?.seatNumber ?? '—'} ·{' '}
                    {bp.cabinClass === 'BUSINESS' ? 'Business' : 'Economy'}
                  </span>
                </span>
                <span className="font-bold tabular-nums shrink-0">
                  ₱{Number(bp.fareAmount).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-100 pt-4 flex items-center justify-between mb-5">
            <span className="text-sm font-extrabold">Total</span>
            <span className="text-xl font-extrabold tabular-nums">
              ₱{Number(booking.totalAmount).toLocaleString()}
            </span>
          </div>
          <button
            onClick={handlePay}
            disabled={paying || cardIncomplete}
            className="w-full h-12 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {paying ? 'Processing…' : `Pay ₱${Number(booking.totalAmount).toLocaleString()}`}
          </button>
        </aside>
      </div>
    </div>
  );
}
