import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { adminService } from '../services/admin.service';
import { delayFlightSchema, updateUserSchema } from '../validators/admin.validator';

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

  listUsers: asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.listUsers(req.query as Record<string, string>);
    res.json({ success: true, data: result });
  }),

  updateUser: asyncHandler(async (req: Request, res: Response) => {
    const input = updateUserSchema.parse(req.body);
    const user = await adminService.updateUser(req.user!.id, String(req.params.id), input);
    res.json({ success: true, data: { user } });
  }),
};
