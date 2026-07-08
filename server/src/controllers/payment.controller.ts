import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { paymentService } from '../services/payment.service';
import { payBookingSchema } from '../validators/payment.validator';

export const paymentController = {
  pay: asyncHandler(async (req: Request, res: Response) => {
    const input = payBookingSchema.parse(req.body);
    const booking = await paymentService.payForBooking(req.user!, input);
    res.json({ success: true, data: booking });
  }),
};
