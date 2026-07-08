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
};
