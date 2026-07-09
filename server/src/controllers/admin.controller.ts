import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { adminService } from '../services/admin.service';
import {
  delayFlightSchema,
  flightStatusSchema,
  updateFlightSchema,
  updateUserSchema,
} from '../validators/admin.validator';

export const adminController = {
  stats: asyncHandler(async (_req: Request, res: Response) => {
    const stats = await adminService.getStats();
    res.json({ success: true, data: stats });
  }),

  listFlights: asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.listFlights(req.query as Record<string, string>);
    res.json({ success: true, data: result });
  }),

  delayFlight: asyncHandler(async (req: Request, res: Response) => {
    const { minutes } = delayFlightSchema.parse(req.body);
    const flight = await adminService.delayFlight(String(req.params.id), minutes);
    res.json({ success: true, data: { flight } });
  }),

  cancelFlight: asyncHandler(async (req: Request, res: Response) => {
    const flight = await adminService.cancelFlight(String(req.params.id));
    res.json({ success: true, data: { flight } });
  }),

  reinstateFlight: asyncHandler(async (req: Request, res: Response) => {
    const flight = await adminService.reinstateFlight(String(req.params.id));
    res.json({ success: true, data: { flight } });
  }),

  updateFlight: asyncHandler(async (req: Request, res: Response) => {
    const input = updateFlightSchema.parse(req.body);
    const flight = await adminService.updateFlightDetails(String(req.params.id), input);
    res.json({ success: true, data: { flight } });
  }),

  setFlightStatus: asyncHandler(async (req: Request, res: Response) => {
    const { status } = flightStatusSchema.parse(req.body);
    const flight = await adminService.setFlightStatus(String(req.params.id), status);
    res.json({ success: true, data: { flight } });
  }),

  listUsers: asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.listUsers(req.query as Record<string, string>);
    res.json({ success: true, data: result });
  }),

  userBookings: asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.getUserBookings(String(req.params.id));
    res.json({ success: true, data: result });
  }),

  checkInBooking: asyncHandler(async (req: Request, res: Response) => {
    const booking = await adminService.checkInBooking(String(req.params.id), req.user!);
    res.json({ success: true, data: booking });
  }),

  updateUser: asyncHandler(async (req: Request, res: Response) => {
    const input = updateUserSchema.parse(req.body);
    const user = await adminService.updateUser(req.user!.id, String(req.params.id), input);
    res.json({ success: true, data: { user } });
  }),
};
