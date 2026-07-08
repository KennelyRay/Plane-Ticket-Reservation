import { prisma } from '../config/db';

export const seatRepository = {
  /** All seats of the aircraft flying the given flight. */
  findByFlightId(flightId: string) {
    return prisma.seat.findMany({
      where: { seatLayout: { aircraft: { flights: { some: { id: flightId } } } } },
      orderBy: [{ row: 'asc' }, { column: 'asc' }],
    });
  },

  /** Seat ids already taken by active bookings on this flight. */
  async findBookedSeatIds(flightId: string) {
    const rows = await prisma.bookingPassenger.findMany({
      where: {
        seatId: { not: null },
        booking: { flightId, status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] } },
      },
      select: { seatId: true },
    });
    return new Set(rows.map((r) => r.seatId!));
  },
};
