import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

const flightInclude = {
  airline: true,
  aircraft: true,
  route: {
    include: { originAirport: true, destinationAirport: true },
  },
} satisfies Prisma.FlightInclude;

export type FlightSortKey = 'departure' | 'price' | 'duration';

const sortOrder: Record<FlightSortKey, Prisma.FlightOrderByWithRelationInput> = {
  departure: { departureTime: 'asc' },
  price: { economyPrice: 'asc' },
  duration: { route: { durationMinutes: 'asc' } },
};

export const flightRepository = {
  search(params: {
    originIata?: string;
    destinationIata?: string;
    date?: Date;
    sort: FlightSortKey;
    page: number;
    pageSize: number;
  }) {
    const where: Prisma.FlightWhereInput = {
      status: { notIn: ['CANCELLED'] },
    };

    if (params.originIata) {
      where.route = { ...(where.route as object), originAirport: { iataCode: params.originIata } };
    }
    if (params.destinationIata) {
      where.route = {
        ...(where.route as object),
        destinationAirport: { iataCode: params.destinationIata },
      };
    }
    if (params.date) {
      const start = new Date(params.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.departureTime = { gte: start, lt: end };
    } else {
      // Browsing without a date defaults to upcoming flights only. Already-departed
      // flights surface only when a specific date is searched (shown as a
      // non-bookable "Departed" section on that day).
      where.departureTime = { gte: new Date() };
    }

    return prisma.$transaction([
      prisma.flight.findMany({
        where,
        include: flightInclude,
        orderBy: [sortOrder[params.sort], { departureTime: 'asc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.flight.count({ where }),
    ]);
  },

  findById(id: string) {
    return prisma.flight.findUnique({ where: { id }, include: flightInclude });
  },
};
