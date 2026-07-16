import dotenv from 'dotenv';

dotenv.config();

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 5000),
  // Comma-separated list of allowed browser origins, e.g. "https://app.vercel.app,http://localhost:5173"
  clientUrls: (process.env.CLIENT_URL ?? 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean),
  databaseUrl: required('DATABASE_URL'),
  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshSecret: required('JWT_REFRESH_SECRET'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  redisUrl: process.env.REDIS_URL || null,
  mail: {
    // Optional: without a key, boarding-pass emails degrade to in-app notifications only
    resendApiKey: process.env.RESEND_API_KEY || null,
    // Resend's shared onboarding sender works out of the box; set MAIL_FROM to a
    // verified-domain address (e.g. "VertixFlights <boarding@yourdomain.com>") in prod
    from: process.env.MAIL_FROM || 'VertixFlights <onboarding@resend.dev>',
  },
};
