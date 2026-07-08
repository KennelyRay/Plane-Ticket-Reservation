import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const bookingInclude = {
  flight: {
    include: {
      airline: true,
      route: { include: { originAirport: true, destinationAirport: true } },
    },
  },
  passengers: { include: { passenger: true, seat: true } },
  payments: { orderBy: { createdAt: 'desc' } },
} satisfies Prisma.BookingInclude;

export const bookingRepository = {
  create(data: Prisma.BookingCreateInput) {
    return prisma.booking.create({ data, include: bookingInclude });
  },

  findById(id: string) {
    return prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  },

  findByReference(bookingReference: string) {
    return prisma.booking.findUnique({ where: { bookingReference }, select: { id: true } });
  },

  findByUser(userId: string) {
    return prisma.booking.findMany({
      where: { userId },
      include: bookingInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  updateStatus(id: string, status: Prisma.BookingUpdateInput['status']) {
    return prisma.booking.update({ where: { id }, data: { status }, include: bookingInclude });
  },

  /** Flip stale PENDING bookings to EXPIRED (lazy sweep before reads). */
  expireStale(where: { id?: string; userId?: string }) {
    return prisma.booking.updateMany({
      where: { ...where, status: 'PENDING', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
  },

  recordPayment(bookingId: string, payment: Omit<Prisma.PaymentCreateManyInput, 'bookingId'>) {
    return prisma.payment.create({ data: { bookingId, ...payment } });
  },

  /** Record the successful payment and confirm the booking atomically. */
  async confirmWithPayment(
    bookingId: string,
    payment: Omit<Prisma.PaymentCreateManyInput, 'bookingId'>
  ) {
    const [, booking] = await prisma.$transaction([
      prisma.payment.create({ data: { bookingId, ...payment } }),
      prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
        include: bookingInclude,
      }),
    ]);
    return booking;
  },
};
