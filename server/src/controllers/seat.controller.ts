import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { seatService } from '../services/seat.service';

const lockSchema = z.object({
  flightId: z.string().min(1),
  seatId: z.string().min(1),
});

export const seatController = {
  getSeatMap: asyncHandler(async (req: Request, res: Response) => {
    const result = await seatService.getSeatMap(String(req.params.flightId), req.user?.id);
    res.json({ success: true, data: result });
  }),

  lock: asyncHandler(async (req: Request, res: Response) => {
    const { flightId, seatId } = lockSchema.parse(req.body);
    const result = await seatService.lockSeat(flightId, seatId, req.user!.id);
    res.json({ success: true, data: result });
  }),

  release: asyncHandler(async (req: Request, res: Response) => {
    const { flightId, seatId } = lockSchema.parse(req.body);
    const result = await seatService.releaseSeat(flightId, seatId, req.user!.id);
    res.json({ success: true, data: result });
  }),
};
