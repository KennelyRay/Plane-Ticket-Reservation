import { prisma } from '../config/db';
import { ApiError } from '../utils/ApiError';
import { bookingRepository } from '../repositories/booking.repository';
import { emailService } from './email.service';
import { AuthUser } from '../middleware/auth';

export const CHECKIN_OPENS_HOURS_BEFORE = 24;

const ticketNumberFor = (bookingReference: string, sequence: number) =>
  `TKT-${bookingReference.replace('VF-', '')}-${String(sequence).padStart(2, '0')}`;

export const checkinService = {
  /**
   * Online check-in: issues CHECKED_IN tickets + boarding passes for every passenger.
   * `overrideWindow` lets staff/admins check a passenger in before the 24h window opens
   * (e.g. manual check-in at the counter).
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

    const boardingTime =
      booking.flight.boardingTime ??
      new Date(booking.flight.departureTime.getTime() - 45 * 60 * 1000);

    await prisma.$transaction(
      booking.passengers.map((bp, i) => {
        const ticketNumber = bp.ticket?.ticketNumber ?? ticketNumberFor(booking.bookingReference, i + 1);
        const qrCodeData = JSON.stringify({
          ticket: ticketNumber,
          ref: booking.bookingReference,
          flight: booking.flight.flightNumber,
          pax: `${bp.passenger.firstName} ${bp.passenger.lastName}`,
          seat: bp.seat?.seatNumber ?? null,
        });
        return prisma.ticket.upsert({
          where: { bookingPassengerId: bp.id },
          update: {
            status: 'CHECKED_IN',
            boardingPass: {
              upsert: {
                update: { gate: booking.flight.gate, boardingTime },
                create: {
                  gate: booking.flight.gate,
                  boardingTime,
                  seatNumber: bp.seat?.seatNumber ?? '—',
                  sequenceNumber: i + 1,
                },
              },
            },
          },
          create: {
            ticketNumber,
            bookingPassengerId: bp.id,
            status: 'CHECKED_IN',
            qrCodeData,
            barcodeData: ticketNumber,
            boardingPass: {
              create: {
                gate: booking.flight.gate,
                boardingTime,
                seatNumber: bp.seat?.seatNumber ?? '—',
                sequenceNumber: i + 1,
              },
            },
          },
        });
      })
    );

    return (await bookingRepository.findById(bookingId))!;
  },

  /**
   * Emails the e-boarding pass to the booking's contact address via Resend.
   * Without a RESEND_API_KEY the send is skipped and only the in-app
   * notification records it (keeps the demo flow working key-less).
   */
  async emailBoardingPass(bookingId: string, user: AuthUser) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking || (booking.userId !== user.id && user.role !== 'ADMIN'))
      throw ApiError.notFound('Booking not found');

    const issued =
      booking.passengers.length > 0 &&
      booking.passengers.every((bp) => bp.ticket?.status === 'CHECKED_IN' && !!bp.ticket?.boardingPass);
    if (!issued)
      throw ApiError.badRequest('Check in first — your boarding pass has not been issued yet');

    const delivered = emailService.isConfigured;
    if (delivered) await emailService.sendBoardingPass(booking);

    const route = `${booking.flight.route.originAirport.iataCode} → ${booking.flight.route.destinationAirport.iataCode}`;
    await prisma.notification.create({
      data: {
        userId: booking.userId,
        type: 'BOARDING_REMINDER',
        title: 'Your e-boarding pass',
        message: `Your e-boarding pass for ${route} (${booking.flight.flightNumber}) has been sent to ${booking.contactEmail}.`,
      },
    });

    return { email: booking.contactEmail, delivered };
  },
};
