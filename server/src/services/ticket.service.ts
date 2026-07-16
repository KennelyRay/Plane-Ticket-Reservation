import { prisma } from '../config/db';
import { bookingRepository } from '../repositories/booking.repository';

type BookingWithDetails = NonNullable<Awaited<ReturnType<typeof bookingRepository.findById>>>;

const ticketNumberFor = (bookingReference: string, sequence: number) =>
  `TKT-${bookingReference.replace('VF-', '')}-${String(sequence).padStart(2, '0')}`;

export const ticketService = {
  /**
   * Issues CHECKED_IN tickets + boarding passes for every passenger in the
   * booking (idempotent — re-running refreshes gate/boarding time). Called on
   * payment confirmation (passes are issued and emailed immediately) and by
   * the online check-in flow, which now just re-affirms them.
   */
  async issueTicketsWithPasses(booking: BookingWithDetails) {
    const boardingTime =
      booking.flight.boardingTime ??
      new Date(booking.flight.departureTime.getTime() - 45 * 60 * 1000);

    await prisma.$transaction(
      booking.passengers.map((bp, i) => {
        const ticketNumber =
          bp.ticket?.ticketNumber ?? ticketNumberFor(booking.bookingReference, i + 1);
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
  },
};
