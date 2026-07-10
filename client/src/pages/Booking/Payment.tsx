import { useState, type ComponentType } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { bookingApi, type PaymentMethod } from '../../features/booking/api';
import LockCountdown from '../../components/booking/LockCountdown';
import { CardIcon, CheckIcon, PlaneIcon, ShieldIcon, TicketIcon, WalletIcon } from '../../components/ui/icons';

const inputClass =
  'w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-ink placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-400 transition-shadow';

const labelClass = 'block text-[11px] font-bold uppercase tracking-wide text-ink-soft mb-1.5';

const METHODS: {
  id: PaymentMethod;
  label: string;
  hint: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { id: 'CARD', label: 'Card', hint: 'Visa · Mastercard · JCB', Icon: CardIcon },
  { id: 'GCASH', label: 'GCash', hint: 'Pay with your GCash wallet', Icon: WalletIcon },
  { id: 'PAYMAYA', label: 'Maya', hint: 'Pay with your Maya wallet', Icon: WalletIcon },
];

const STEPS = ['Seats', 'Passengers', 'Payment'] as const;

// ── Card brand detection ─────────────────────────────────────
// Detected from the leading digits (IIN ranges). Bank-issued cards (BPI,
// BDO, …) surface as the network they run on — Visa or Mastercard.

type CardBrandId =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'jcb'
  | 'discover'
  | 'diners'
  | 'unionpay';

const CARD_BRANDS: {
  id: CardBrandId;
  name: string;
  match: RegExp;
  /** digit grouping on the card face */
  groups: number[];
  /** radial accents behind the preview card */
  glow: [string, string];
}[] = [
  { id: 'visa', name: 'Visa', match: /^4/, groups: [4, 4, 4, 4], glow: ['rgb(37 99 235 / 0.7)', 'rgb(14 165 233 / 0.55)'] },
  { id: 'mastercard', name: 'Mastercard', match: /^(5[1-5]|2[3-6]|22[2-9]|27[01]|2720)/, groups: [4, 4, 4, 4], glow: ['rgb(234 88 12 / 0.6)', 'rgb(220 38 38 / 0.5)'] },
  { id: 'amex', name: 'Amex', match: /^3[47]/, groups: [4, 6, 5], glow: ['rgb(13 148 136 / 0.6)', 'rgb(37 99 235 / 0.5)'] },
  { id: 'jcb', name: 'JCB', match: /^35(2[89]|[3-8])/, groups: [4, 4, 4, 4], glow: ['rgb(22 163 74 / 0.55)', 'rgb(37 99 235 / 0.5)'] },
  { id: 'discover', name: 'Discover', match: /^(6011|64[4-9]|65)/, groups: [4, 4, 4, 4], glow: ['rgb(249 115 22 / 0.6)', 'rgb(120 113 108 / 0.5)'] },
  { id: 'diners', name: 'Diners Club', match: /^3(0[0-5]|[689])/, groups: [4, 6, 4], glow: ['rgb(100 116 139 / 0.6)', 'rgb(37 99 235 / 0.5)'] },
  { id: 'unionpay', name: 'UnionPay', match: /^62/, groups: [4, 4, 4, 4], glow: ['rgb(220 38 38 / 0.55)', 'rgb(13 148 136 / 0.5)'] },
];

const detectBrand = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits ? CARD_BRANDS.find((b) => b.match.test(digits)) ?? null : null;
};

/** Group digits per brand (Amex 4-6-5, Diners 4-6-4, default 4-4-4-4…). */
const groupDigits = (digits: string, groups: number[]) => {
  const out: string[] = [];
  let at = 0;
  for (const size of groups) {
    if (at >= digits.length) break;
    out.push(digits.slice(at, at + size));
    at += size;
  }
  // anything beyond the pattern (long Visa PANs) keeps flowing in 4s
  while (at < digits.length) {
    out.push(digits.slice(at, at + 4));
    at += 4;
  }
  return out;
};

const formatCardNumber = (v: string) => {
  const digits = v.replace(/\D/g, '').slice(0, 19);
  const brand = detectBrand(digits);
  return groupDigits(digits, brand?.groups ?? [4, 4, 4, 4]).join(' ');
};

const formatExpiry = (v: string) => {
  const digits = v.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

/** Brand mark drawn with CSS — enough to be recognizable at card size. */
function BrandLogo({ brand }: { brand: CardBrandId | null }) {
  switch (brand) {
    case 'visa':
      return <span className="text-xl font-black italic tracking-tighter text-white">VISA</span>;
    case 'mastercard':
      return (
        <span className="flex items-center">
          <span className="w-6 h-6 rounded-full bg-red-500" />
          <span className="w-6 h-6 rounded-full bg-amber-400/90 -ml-2.5 mix-blend-plus-lighter" />
        </span>
      );
    case 'amex':
      return (
        <span className="px-2 py-1 rounded-md bg-sky-500/25 border border-sky-200/50 text-[11px] font-black tracking-[0.18em] text-sky-100">
          AMEX
        </span>
      );
    case 'jcb':
      return (
        <span className="flex items-center gap-0.5">
          <span className="w-2 h-6 rounded-sm bg-blue-500" />
          <span className="w-2 h-6 rounded-sm bg-red-500" />
          <span className="w-2 h-6 rounded-sm bg-emerald-500" />
          <span className="ml-1.5 text-sm font-black tracking-wide text-white">JCB</span>
        </span>
      );
    case 'discover':
      return (
        <span className="flex items-center gap-1.5 text-[11px] font-black tracking-[0.14em] text-white">
          DISC<span className="w-3.5 h-3.5 rounded-full bg-orange-500 -mx-0.5" />VER
        </span>
      );
    case 'diners':
      return <span className="text-[11px] font-black tracking-[0.12em] text-white">DINERS CLUB</span>;
    case 'unionpay':
      return <span className="text-sm font-black tracking-wide text-white">UnionPay</span>;
    default:
      return <CardIcon className="w-6 h-6 text-white/80" />;
  }
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

/** Live preview of the card being typed — brand mark, digit grouping and
 *  glow all follow the detected network. Purely decorative. */
function CardPreview({ holder, number, expiry }: { holder: string; number: string; expiry: string }) {
  const brand = detectBrand(number);
  const groups = brand?.groups ?? [4, 4, 4, 4];
  const panLength = groups.reduce((sum, g) => sum + g, 0);
  const digits = number.replace(/\D/g, '');
  const shown = groupDigits(digits.padEnd(panLength, '•'), groups);
  const [glowA, glowB] = brand?.glow ?? ['rgb(124 58 237 / 0.65)', 'rgb(37 99 235 / 0.6)'];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-brand-950 text-white p-5 shadow-lift max-w-sm transition-colors">
      <div
        className="pointer-events-none absolute inset-0 transition-all duration-500"
        style={{
          background: `radial-gradient(280px 160px at 90% -20%, ${glowA}, transparent 65%), radial-gradient(300px 170px at 0% 120%, ${glowB}, transparent 65%)`,
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-7 h-7">
          <span className="w-9 h-7 rounded-md bg-gradient-to-br from-amber-200 to-amber-400" />
          <BrandLogo brand={brand?.id ?? null} />
        </div>
        <p className="font-mono text-lg tracking-[0.14em] tabular-nums whitespace-nowrap">
          {shown.map((g, i) => (
            <span key={i} className={`${i > 0 ? 'ml-3' : ''} ${/\d/.test(g) ? '' : 'text-white/40'}`}>
              {g}
            </span>
          ))}
        </p>
        <div className="flex items-end justify-between mt-6 gap-4">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/50">
              Cardholder
            </p>
            <p className="text-sm font-bold uppercase truncate">{holder || 'YOUR NAME'}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/50">Expires</p>
            <p className="text-sm font-bold tabular-nums">{expiry || 'MM/YY'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

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
        <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-slate-100 text-ink-soft flex items-center justify-center">
          <TicketIcon className="w-7 h-7" />
        </div>
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
    <div className="space-y-6 animate-fade-up max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={`/bookings/${booking.id}`}
          className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:underline"
        >
          ← Booking {booking.bookingReference}
        </Link>
        {booking.expiresAt && (
          <span className="ml-auto inline-flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Seats held — pay within{' '}
            <LockCountdown
              expiresAt={new Date(booking.expiresAt).getTime()}
              onExpire={() => queryClient.invalidateQueries({ queryKey: ['booking', bookingId] })}
            />
          </span>
        )}
      </div>

      <div>
        {/* Checkout steps — seats and passengers are already behind us */}
        <ol className="flex items-center gap-2 mb-4">
          {STEPS.map((step, i) => {
            const done = i < STEPS.length - 1;
            return (
              <li key={step} className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold ${
                    done
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-brand-600 border-brand-600 text-white shadow-soft'
                  }`}
                >
                  {done ? <CheckIcon className="w-3 h-3" /> : <span>{i + 1}</span>}
                  {step}
                </span>
                {i < STEPS.length - 1 && <span className="w-5 border-t-2 border-dotted border-slate-300" />}
              </li>
            );
          })}
        </ol>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Checkout</h1>
        <p className="text-sm font-medium text-ink-soft mt-1">
          One step left — settle the fare and your e-tickets are issued instantly.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium animate-fade-in">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* Method + form */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 sm:p-6">
          <h2 className="font-extrabold tracking-tight mb-4">Payment method</h2>

          <div className="grid grid-cols-3 gap-2.5 mb-6">
            {METHODS.map((m) => {
              const active = method === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`relative rounded-xl border p-3 text-left transition-all ${
                    active
                      ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-500/30'
                      : 'border-slate-200 hover:border-brand-200 hover:bg-slate-50/60'
                  }`}
                >
                  {active && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center">
                      <CheckIcon className="w-2.5 h-2.5" />
                    </span>
                  )}
                  <m.Icon className={`w-5 h-5 ${active ? 'text-brand-600' : 'text-ink-soft'}`} />
                  <p className="text-sm font-bold text-ink mt-1">{m.label}</p>
                  <p className="text-[10px] font-medium text-ink-soft leading-tight">{m.hint}</p>
                </button>
              );
            })}
          </div>

          {method === 'CARD' ? (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-start">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 order-2 md:order-1">
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
                  <div className="relative">
                    <input
                      value={card.number}
                      onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })}
                      className={`${inputClass} font-mono tabular-nums pr-24`}
                      placeholder="4242 4242 4242 4242"
                      inputMode="numeric"
                      autoComplete="cc-number"
                    />
                    {detectBrand(card.number) && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md bg-brand-50 border border-brand-100 text-[10px] font-bold text-brand-700 animate-fade-in">
                        {detectBrand(card.number)!.name}
                      </span>
                    )}
                  </div>
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
              <div className="order-1 md:order-2 md:w-72">
                <CardPreview holder={card.holder} number={card.number} expiry={card.expiry} />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center">
              <span className="mx-auto mb-2 w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <WalletIcon className="w-6 h-6" />
              </span>
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
        <aside className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden lg:sticky lg:top-24">
          {/* Flight strip */}
          <div className="relative bg-brand-950 text-white p-5">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(240px 130px at 100% 0%, rgb(124 58 237 / 0.5), transparent 60%), radial-gradient(240px 130px at 0% 100%, rgb(37 99 235 / 0.5), transparent 60%)',
              }}
            />
            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-200 mb-2.5">
                {flight.airline.name} · {flight.flightNumber} · {formatDate(flight.departureTime)}
              </p>
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-2xl font-extrabold tracking-tight leading-none">
                    {flight.route.originAirport.iataCode}
                  </p>
                  <p className="text-[11px] font-semibold text-white/70 mt-1 tabular-nums">
                    {formatTime(flight.departureTime)}
                  </p>
                </div>
                <div className="flex-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                  <span className="flex-1 border-t border-dashed border-white/30" />
                  <PlaneIcon className="w-3.5 h-3.5 text-white/80" />
                  <span className="flex-1 border-t border-dashed border-white/30" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold tracking-tight leading-none">
                    {flight.route.destinationAirport.iataCode}
                  </p>
                  <p className="text-[11px] font-semibold text-white/70 mt-1 tabular-nums">
                    {formatTime(flight.arrivalTime)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <h2 className="font-extrabold tracking-tight mb-4">Order summary</h2>
            <ul className="space-y-2.5 mb-4">
              {booking.passengers.map((bp) => (
                <li key={bp.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-ink truncate">
                    {bp.passenger.title ? `${bp.passenger.title} ` : ''}
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
            <div className="border-t border-dashed border-slate-200 pt-4 flex items-baseline justify-between mb-1">
              <span className="text-sm font-extrabold">Total</span>
              <span className="text-2xl font-extrabold tabular-nums">
                ₱{Number(booking.totalAmount).toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] font-medium text-ink-soft mb-5">
              {booking.passengers.length}{' '}
              {booking.passengers.length === 1 ? 'passenger' : 'passengers'} · taxes and seat fees
              included
            </p>
            <button
              onClick={handlePay}
              disabled={paying || cardIncomplete}
              className="w-full h-12 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {paying ? 'Processing…' : `Pay ₱${Number(booking.totalAmount).toLocaleString()}`}
            </button>
            {cardIncomplete && (
              <p className="text-[11px] font-medium text-ink-soft text-center mt-2.5">
                Complete the card details to continue
              </p>
            )}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-ink-soft">
              <ShieldIcon className="w-3.5 h-3.5 text-emerald-500" />
              Secured · your seats stay locked while you pay
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
