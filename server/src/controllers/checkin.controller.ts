import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { checkinService } from '../services/checkin.service';

export const checkinController = {
  checkIn: asyncHandler(async (req: Request, res: Response) => {
    const booking = await checkinService.checkIn(String(req.params.bookingId), req.user!);
    res.json({ success: true, data: booking });
  }),

  emailBoardingPass: asyncHandler(async (req: Request, res: Response) => {
    const result = await checkinService.emailBoardingPass(String(req.params.bookingId), req.user!);
    res.json({ success: true, data: result });
  }),
};
