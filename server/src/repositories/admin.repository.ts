import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const flightListInclude = {
  airline: { select: { name: true, iataCode: true } },
  route: {
    include: {
      originAirport: { select: { iataCode: true, city: true } },
      destinationAirport: { select: { iataCode: true, city: true } },
    },
  },
  aircraft: { select: { model: true, totalSeats: true } },
  _count: { select: { bookings: true } },
} satisfies Prisma.FlightInclude;

export const adminRepository = {
  getStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000);

    return prisma.$transaction([
      prisma.user.count(),
      prisma.flight.count(),
      prisma.booking.count(),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'PAID' } }),
      prisma.flight.count({
        where: { departureTime: { gte: startOfToday, lt: endOfToday } },
      }),
      prisma.flight.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.flight.findMany({
        where: { departureTime: { gte: new Date(), lte: in48h } },
        include: flightListInclude,
        orderBy: { departureTime: 'asc' },
        take: 8,
      }),
      prisma.booking.findMany({
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          flight: {
            select: {
              flightNumber: true,
              route: {
                select: {
                  originAirport: { select: { iataCode: true } },
                  destinationAirport: { select: { iataCode: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);
  },

  listFlights(params: { scope: 'upcoming' | 'all'; status?: string; page: number; pageSize: number }) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const where: Prisma.FlightWhereInput = {};
    if (params.scope === 'upcoming') where.departureTime = { gte: startOfToday };
    if (params.status) where.status = params.status as Prisma.FlightWhereInput['status'];

    return prisma.$transaction([
      prisma.flight.findMany({
        where,
        include: flightListInclude,
        orderBy: { departureTime: params.scope === 'upcoming' ? 'asc' : 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.flight.count({ where }),
    ]);
  },

  findFlightById(id: string) {
    return prisma.flight.findUnique({ where: { id } });
  },

  updateFlight(id: string, data: Prisma.FlightUpdateInput) {
    return prisma.flight.update({ where: { id }, data, include: flightListInclude });
  },

  listUsers(params: { page: number; pageSize: number }) {
    return prisma.$transaction([
      prisma.user.findMany({
        include: { role: true, _count: { select: { bookings: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.user.count(),
    ]);
  },

  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id }, include: { role: true } });
  },

  updateUser(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
      include: { role: true, _count: { select: { bookings: true } } },
    });
  },

  findRoleByName(name: string) {
    return prisma.role.findUnique({ where: { name } });
  },
};
