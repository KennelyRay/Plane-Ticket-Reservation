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
  async getStats() {
    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const upcomingFlightWhere: Prisma.FlightWhereInput = {
      departureTime: { gte: now },
      status: { not: 'CANCELLED' },
    };

    const [
      totalUsers,
      totalFlights,
      totalBookings,
      revenueAgg,
      pendingRevenueAgg,
      refundedAgg,
      avgBookingAgg,
      flightsToday,
      newUsers7d,
      flightStatusGroups,
      bookingStatusGroups,
      upcomingFlights,
      recentBookings,
      upcomingCapacity,
      seatsSold,
      recentPayments,
      topRoutes,
    ] = await prisma.$transaction([
      prisma.user.count(),
      prisma.flight.count(),
      prisma.booking.count(),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'PAID' } }),
      prisma.booking.aggregate({ _sum: { totalAmount: true }, where: { status: 'PENDING' } }),
      prisma.refund.aggregate({
        _sum: { amount: true },
        where: { status: { in: ['APPROVED', 'PROCESSED'] } },
      }),
      prisma.booking.aggregate({
        _avg: { totalAmount: true },
        where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
      }),
      prisma.flight.count({
        where: { departureTime: { gte: startOfToday, lt: endOfToday } },
      }),
      prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
      prisma.flight.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.booking.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.flight.findMany({
        where: { departureTime: { gte: now, lte: in48h } },
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
      // Seat load factor: capacity of upcoming flights vs seats actually sold.
      prisma.flight.findMany({
        where: upcomingFlightWhere,
        select: { aircraft: { select: { totalSeats: true } } },
      }),
      prisma.bookingPassenger.count({
        where: {
          booking: {
            status: { in: ['CONFIRMED', 'PENDING'] },
            flight: upcomingFlightWhere,
          },
        },
      }),
      prisma.payment.findMany({
        where: { status: 'PAID', paidAt: { gte: last7Days } },
        select: { paidAt: true, amount: true },
      }),
      prisma.$queryRaw<
        Array<{ originCode: string; originCity: string; destCode: string; destCity: string; bookings: number }>
      >`
        SELECT o."iataCode" AS "originCode", o."city" AS "originCity",
               d."iataCode" AS "destCode", d."city" AS "destCity",
               COUNT(b.id)::int AS "bookings"
        FROM "bookings" b
        JOIN "flights" f ON f.id = b."flightId"
        JOIN "flight_routes" r ON r.id = f."routeId"
        JOIN "airports" o ON o.id = r."originAirportId"
        JOIN "airports" d ON d.id = r."destinationAirportId"
        GROUP BY o."iataCode", o."city", d."iataCode", d."city"
        ORDER BY "bookings" DESC
        LIMIT 5
      `,
    ]);

    return {
      totalUsers,
      totalFlights,
      totalBookings,
      revenueAgg,
      pendingRevenueAgg,
      refundedAgg,
      avgBookingAgg,
      flightsToday,
      newUsers7d,
      flightStatusGroups,
      bookingStatusGroups,
      upcomingFlights,
      recentBookings,
      capacitySeats: upcomingCapacity.reduce((sum, f) => sum + f.aircraft.totalSeats, 0),
      seatsSold,
      recentPayments,
      topRoutes,
    };
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
