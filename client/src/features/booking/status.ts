import type { Booking, BookingStatus } from './api';

export interface DisplayStatus {
  label: string;
  className: string;
}

const BASE: Record<BookingStatus, DisplayStatus> = {
  PENDING: { label: 'Pending', className: 'bg-amber-50 border-amber-200 text-amber-700' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-50 border-red-200 text-red-600' },
  EXPIRED: { label: 'Expired', className: 'bg-slate-100 border-slate-200 text-slate-500' },
  COMPLETED: { label: 'Completed', className: 'bg-sky-50 border-sky-200 text-sky-700' },
};

/**
 * What a booking's chip should say right now: paid bookings progress through
 * Boarding → In flight → Completed as their flight actually happens; every
 * other status renders as-is.
 */
export const bookingDisplayStatus = (b: Booking, now = Date.now()): DisplayStatus => {
  if (b.status === 'CONFIRMED' || b.status === 'COMPLETED') {
    const departure = new Date(b.flight.departureTime).getTime();
    const arrival = new Date(b.flight.arrivalTime).getTime();
    const boarding = b.flight.boardingTime
      ? new Date(b.flight.boardingTime).getTime()
      : departure - 45 * 60_000;
    if (now >= arrival) return BASE.COMPLETED;
    if (now >= departure)
      return { label: 'In flight', className: 'bg-brand-50 border-brand-200 text-brand-700' };
    if (now >= boarding)
      return { label: 'Boarding', className: 'bg-amber-50 border-amber-200 text-amber-700' };
  }
  return BASE[b.status];
};
