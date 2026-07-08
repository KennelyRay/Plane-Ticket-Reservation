import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { flightService } from '../services/flight.service';

export const flightController = {
  search: asyncHandler(async (req: Request, res: Response) => {
    const result = await flightService.search(req.query as Record<string, string>);
    res.json({ success: true, data: result });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const flight = await flightService.getById(String(req.params.id));
    res.json({ success: true, data: { flight } });
  }),
};
