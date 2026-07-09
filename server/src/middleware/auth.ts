import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.accessToken;

  if (!token) return next(ApiError.unauthorized('Authentication required'));

  try {
    const payload = jwt.verify(token, env.jwt.secret) as AuthUser & jwt.JwtPayload;
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
};

/** Attaches req.user when a valid token is present, but never rejects. */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.accessToken;
  if (token) {
    try {
      const payload = jwt.verify(token, env.jwt.secret) as AuthUser & jwt.JwtPayload;
      req.user = { id: payload.id, email: payload.email, role: payload.role };
    } catch {
      // invalid token on a public route — treat as anonymous
    }
  }
  next();
};

export const authorize =
  (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized('Authentication required'));
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden('Insufficient permissions'));
    next();
  };

/** Rejects the listed roles; used to keep admins out of customer-only modules. */
export const denyRoles =
  (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized('Authentication required'));
    if (roles.includes(req.user.role)) return next(ApiError.forbidden('Insufficient permissions'));
    next();
  };
