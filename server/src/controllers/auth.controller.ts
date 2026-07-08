import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authService } from '../services/auth.service';
import { loginSchema, registerSchema } from '../validators/auth.validator';
import { env } from '../config/env';

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    res.cookie('refreshToken', result.refreshToken, refreshCookieOptions);
    res.status(201).json({ success: true, data: { user: result.user, accessToken: result.accessToken } });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.cookie('refreshToken', result.refreshToken, refreshCookieOptions);
    res.json({ success: true, data: { user: result.user, accessToken: result.accessToken } });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.refreshToken ?? req.body?.refreshToken;
    const result = await authService.refresh(token ?? '');
    res.cookie('refreshToken', result.refreshToken, refreshCookieOptions);
    res.json({ success: true, data: { user: result.user, accessToken: result.accessToken } });
  }),

  logout: asyncHandler(async (_req: Request, res: Response) => {
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ success: true, message: 'Logged out' });
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.me(req.user!.id);
    res.json({ success: true, data: { user } });
  }),
};
