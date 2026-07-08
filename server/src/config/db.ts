import { PrismaClient } from '@prisma/client';
import { env } from './env';

// Single PrismaClient instance shared across the app (avoids exhausting
// Neon's pooled connections during dev hot-reload).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isProduction ? ['error'] : ['warn', 'error'],
  });

if (!env.isProduction) globalForPrisma.prisma = prisma;
