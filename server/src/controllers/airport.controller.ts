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
};
