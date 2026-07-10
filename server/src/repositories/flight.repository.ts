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
export type FlightStatusFilter = 'upcoming' | 'boarding' | 'departed';

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
    status?: FlightStatusFilter;
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

    const time: Prisma.FlightWhereInput[] = [];
    if (params.date) {
      const start = new Date(params.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      time.push({ departureTime: { gte: start, lt: end } });
    }
    const now = new Date();
    if (params.status === 'departed') {
      time.push({ departureTime: { lte: now } });
    } else if (params.status === 'boarding') {
      // Boarding call is out but the plane is still at the gate
      time.push({ boardingTime: { lte: now } }, { departureTime: { gt: now } });
    } else if (params.status === 'upcoming') {
      // Not yet boarding; flights without a boarding time count once not departed
      time.push({
        OR: [{ boardingTime: { gt: now } }, { boardingTime: null, departureTime: { gt: now } }],
      });
    } else if (!params.date) {
      // Browsing without a date or status defaults to upcoming flights only.
      // Already-departed flights surface only when a specific date is searched
      // (shown as a non-bookable "Departed" section on that day).
      time.push({ departureTime: { gte: now } });
    }
    if (time.length > 0) where.AND = time;

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
