import { prisma } from '../config/db';
import { ApiError } from '../utils/ApiError';
import { bookingRepository } from '../repositories/booking.repository';
import { AuthUser } from '../middleware/auth';

export const CHECKIN_OPENS_HOURS_BEFORE = 24;

const ticketNumberFor = (bookingReference: string, sequence: number) =>
  `TKT-${bookingReference.replace('VF-', '')}-${String(sequence).padStart(2, '0')}`;

export const checkinService = {
  /** Online check-in: issues CHECKED_IN tickets + boarding passes for every passenger. */
  async checkIn(bookingId: string, user: AuthUser) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking || (booking.userId !== user.id && user.role !== 'ADMIN'))
      throw ApiError.notFound('Booking not found');

    if (booking.status !== 'CONFIRMED')
      throw ApiError.badRequest('Only confirmed bookings can check in');

    const now = new Date();
    const opensAt = new Date(
      booking.flight.departureTime.getTime() - CHECKIN_OPENS_HOURS_BEFORE * 60 * 60 * 1000
    );
    if (now < opensAt)
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
};
