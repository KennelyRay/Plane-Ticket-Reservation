import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import { seatApi, type SeatMapSeat } from '../../features/seat/api';
import { bookingApi } from '../../features/booking/api';
import { useSeatSocket } from '../../hooks/useSeatSocket';
import { useAuthStore } from '../../features/auth/store';
import LockCountdown from '../../components/booking/LockCountdown';
import { AlertIcon, SeatIcon } from '../../components/ui/icons';
import type { Flight } from '../../types';

const inputClass =
  'w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-ink placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-400 transition-shadow';

const labelClass = 'block text-[11px] font-bold uppercase tracking-wide text-ink-soft mb-1.5';

const passengerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required')
    .refine((d) => new Date(d) < new Date(), 'Must be in the past'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  nationality: z.string().min(1, 'Nationality is required'),
  passportNumber: z.string().optional(),
});

const schema = z.object({
  contactEmail: z.string().email('Enter a valid email'),
  contactPhone: z.string().optional(),
  passengers: z.array(passengerSchema),
});

type FormValues = z.infer<typeof schema>;

const cabinBasePrice = (flight: Flight, cabin: SeatMapSeat['cabinClass']) => {
  if (cabin === 'BUSINESS' || cabin === 'FIRST') {
    const premium = cabin === 'FIRST' ? flight.firstClassPrice : flight.businessPrice;
    return Number(premium ?? flight.businessPrice ?? flight.economyPrice);
  }
  return Number(flight.economyPrice);
};

function PassengerForm({
  flightId,
  flight,
  seats,
}: {
  flightId: string;
  flight: Flight;
  seats: SeatMapSeat[];
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contactEmail: user?.email ?? '',
      contactPhone: user?.phone ?? '',
      passengers: seats.map(() => ({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'MALE' as const,
        nationality: 'Philippines',
        passportNumber: '',
      })),
    },
  });

  const fares = seats.map((s) => cabinBasePrice(flight, s.cabinClass) + Number(s.extraPrice));
  const total = fares.reduce((sum, f) => sum + f, 0);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const booking = await bookingApi.create({
        flightId,
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone || undefined,
        passengers: values.passengers.map((p, i) => ({
          seatId: seats[i].id,
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: p.dateOfBirth,
          gender: p.gender,
          nationality: p.nationality,
          passportNumber: p.passportNumber || undefined,
        })),
      });
      queryClient.invalidateQueries({ queryKey: ['seatmap', flightId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      navigate(`/bookings/${booking.id}/pay`, { replace: true });
    } catch (err) {
      setServerError(
        isAxiosError(err)
          ? err.response?.data?.message ?? 'Could not create the booking'
          : 'Could not create the booking'
      );
      queryClient.invalidateQueries({ queryKey: ['seatmap', flightId] });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium animate-fade-in">
          {serverError}
        </div>
      )}

      {seats.map((seat, i) => (
        <section
          key={seat.id}
          className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 sm:p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-600 to-violet-glow text-white text-xs font-bold flex items-center justify-center">
              {seat.seatNumber}
            </span>
            <div>
              <h2 className="font-extrabold tracking-tight leading-tight">Passenger {i + 1}</h2>
              <p className="text-xs font-semibold text-ink-soft capitalize">
                {seat.cabinClass === 'BUSINESS' ? 'Business' : 'Economy'} ·{' '}
                {seat.seatType.toLowerCase()} · ₱{fares[i].toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>First name</label>
              <input
                {...register(`passengers.${i}.firstName`)}
                className={inputClass}
                placeholder="Juan"
              />
              {errors.passengers?.[i]?.firstName && (
                <p className="text-xs font-medium text-red-600 mt-1.5">
                  {errors.passengers[i]?.firstName?.message}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Last name</label>
              <input
                {...register(`passengers.${i}.lastName`)}
                className={inputClass}
                placeholder="Dela Cruz"
              />
              {errors.passengers?.[i]?.lastName && (
                <p className="text-xs font-medium text-red-600 mt-1.5">
                  {errors.passengers[i]?.lastName?.message}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Date of birth</label>
              <input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                {...register(`passengers.${i}.dateOfBirth`)}
                className={inputClass}
              />
              {errors.passengers?.[i]?.dateOfBirth && (
                <p className="text-xs font-medium text-red-600 mt-1.5">
                  {errors.passengers[i]?.dateOfBirth?.message}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Gender</label>
              <select {...register(`passengers.${i}.gender`)} className={inputClass}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Nationality</label>
              <input
                {...register(`passengers.${i}.nationality`)}
                className={inputClass}
                placeholder="Philippines"
              />
              {errors.passengers?.[i]?.nationality && (
                <p className="text-xs font-medium text-red-600 mt-1.5">
                  {errors.passengers[i]?.nationality?.message}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>
                Passport number <span className="normal-case font-medium">(optional)</span>
              </label>
              <input
                {...register(`passengers.${i}.passportNumber`)}
                className={inputClass}
                placeholder="P1234567A"
              />
            </div>
          </div>
        </section>
      ))}

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 sm:p-6">
        <h2 className="font-extrabold tracking-tight mb-5">Contact details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              {...register('contactEmail')}
              className={inputClass}
              placeholder="you@example.com"
            />
            {errors.contactEmail && (
              <p className="text-xs font-medium text-red-600 mt-1.5">
                {errors.contactEmail.message}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>
              Phone <span className="normal-case font-medium">(optional)</span>
            </label>
            <input
              {...register('contactPhone')}
              className={inputClass}
              placeholder="+63 917 123 4567"
            />
          </div>
        </div>
      </section>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 sm:p-6 flex flex-wrap items-center gap-5">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Total</p>
          <p className="text-2xl font-extrabold tabular-nums">₱{total.toLocaleString()}</p>
          <p className="text-xs font-medium text-ink-soft mt-0.5">
            {seats.length} {seats.length === 1 ? 'passenger' : 'passengers'} · fares + seat fees
          </p>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 px-8 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Booking…' : 'Confirm booking'}
        </button>
      </div>
    </form>
  );
}

export default function PassengerDetails() {
  const { flightId } = useParams<{ flightId: string }>();
  const queryClient = useQueryClient();

  useSeatSocket(flightId);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['seatmap', flightId],
    queryFn: () => seatApi.getSeatMap(flightId!),
    enabled: !!flightId,
  });

  const mySeats = useMemo(() => data?.seats.filter((s) => s.lockedByMe) ?? [], [data]);
  const earliestExpiry = mySeats.length
    ? Math.min(...mySeats.map((s) => s.lockExpiresAt ?? Infinity))
    : null;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['seatmap', flightId] });

  if (isLoading)
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center animate-pulse">
        <p className="text-sm font-semibold text-ink-soft">Loading your seats…</p>
      </div>
    );

  if (isError || !data)
    return (
      <div className="bg-white rounded-2xl border border-red-100 p-12 text-center">
        <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
          <AlertIcon className="w-7 h-7" />
        </div>
        <p className="font-bold">Could not load your selection</p>
        <p className="text-sm text-ink-soft mt-1">Please try again in a moment.</p>
      </div>
    );

  if (mySeats.length === 0)
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center animate-fade-up">
        <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
          <SeatIcon className="w-7 h-7" />
        </div>
        <p className="font-bold">No seats held</p>
        <p className="text-sm text-ink-soft mt-1 mb-5">
          Your seat holds may have expired. Pick your seats again to continue.
        </p>
        <Link
          to={`/flights/${flightId}/seats`}
          className="inline-flex h-11 px-6 items-center rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift transition-all"
        >
          Choose seats
        </Link>
      </div>
    );

  const { flight } = data;

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={`/flights/${flightId}/seats`}
          className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:underline"
        >
          ← Back to seat map
        </Link>
        {earliestExpiry && earliestExpiry !== Infinity && (
          <span className="ml-auto inline-flex items-center gap-2 text-xs font-semibold text-ink-soft bg-brand-50 border border-brand-100 rounded-xl px-3 py-2">
            Seats held for <LockCountdown expiresAt={earliestExpiry} onExpire={invalidate} />
          </span>
        )}
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Passenger details</h1>
        <p className="text-sm font-medium text-ink-soft mt-1">
          {flight.route.originAirport.city} → {flight.route.destinationAirport.city} ·{' '}
          {flight.airline.name} · {flight.flightNumber} · seats{' '}
          {mySeats.map((s) => s.seatNumber).join(', ')}
        </p>
      </div>

      <PassengerForm flightId={flightId!} flight={flight} seats={mySeats} />
    </div>
  );
}
