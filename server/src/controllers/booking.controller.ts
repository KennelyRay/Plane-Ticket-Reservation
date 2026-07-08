import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { bookingService } from '../services/booking.service';
import { createBookingSchema } from '../validators/booking.validator';

export const bookingController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const input = createBookingSchema.parse(req.body);
    const booking = await bookingService.createBooking(req.user!.id, input);
    res.status(201).json({ success: true, data: booking });
  }),

  listMine: asyncHandler(async (req: Request, res: Response) => {
    const bookings = await bookingService.getMyBookings(req.user!.id);
    res.json({ success: true, data: bookings });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const booking = await bookingService.getBooking(String(req.params.id), req.user!);
    res.json({ success: true, data: booking });
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const booking = await bookingService.cancelBooking(String(req.params.id), req.user!);
    res.json({ success: true, data: booking });
  }),
};
