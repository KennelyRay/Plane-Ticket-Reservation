import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../config/db';

export const airportController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const airports = await prisma.airport.findMany({
      orderBy: [{ country: 'asc' }, { city: 'asc' }],
    });
    res.json({ success: true, data: { airports } });
  }),

  // Flat origin→destination pairs so the client can offer only reachable
  // destinations once an origin is picked.
  routes: asyncHandler(async (_req: Request, res: Response) => {
    const routes = await prisma.flightRoute.findMany({
      select: {
        originAirport: { select: { iataCode: true } },
        destinationAirport: { select: { iataCode: true } },
      },
    });
    res.json({
      success: true,
      data: {
        routes: routes.map((r) => ({
          origin: r.originAirport.iataCode,
          destination: r.destinationAirport.iataCode,
        })),
      },
    });
  }),
};
