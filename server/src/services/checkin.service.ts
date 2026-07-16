import { ApiError } from '../utils/ApiError';
import { bookingRepository } from '../repositories/booking.repository';
import { ticketService } from './ticket.service';
import { AuthUser } from '../middleware/auth';

export const CHECKIN_OPENS_HOURS_BEFORE = 24;

export const checkinService = {
  /**
   * Online check-in. Boarding passes are normally issued (and emailed) the
   * moment payment confirms, so this mostly re-affirms them — but it still
   * covers older bookings paid before auto-issue existed, and refreshes
   * gate/boarding time on the passes.
   * `overrideWindow` lets staff/admins check a passenger in before the 24h
   * window opens (e.g. manual check-in at the counter).
   */
  async checkIn(bookingId: string, user: AuthUser, opts: { overrideWindow?: boolean } = {}) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking || (booking.userId !== user.id && user.role !== 'ADMIN'))
      throw ApiError.notFound('Booking not found');

    if (booking.status !== 'CONFIRMED')
      throw ApiError.badRequest('Only confirmed bookings can check in');

    const now = new Date();
    const opensAt = new Date(
      booking.flight.departureTime.getTime() - CHECKIN_OPENS_HOURS_BEFORE * 60 * 60 * 1000
    );
    if (!opts.overrideWindow && now < opensAt)
      throw ApiError.badRequest(
        `Check-in opens ${CHECKIN_OPENS_HOURS_BEFORE} hours before departure`
      );
    if (booking.flight.departureTime <= now)
      throw ApiError.badRequest('This flight has already departed');

    await ticketService.issueTicketsWithPasses(booking);

    return (await bookingRepository.findById(bookingId))!;
  },
};
