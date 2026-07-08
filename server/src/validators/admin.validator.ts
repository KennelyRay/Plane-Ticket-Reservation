import { z } from 'zod';

export const delayFlightSchema = z.object({
  minutes: z.number().int().min(5, 'Minimum delay is 5 minutes').max(1440, 'Maximum delay is 24 hours'),
});

export const updateUserSchema = z
  .object({
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
    role: z
      .enum([
        'GUEST',
        'CUSTOMER',
        'TICKETING_STAFF',
        'CHECKIN_STAFF',
        'GATE_AGENT',
        'FLIGHT_OPS',
        'FINANCE',
        'ADMIN',
      ])
      .optional(),
  })
  .refine((v) => v.status !== undefined || v.role !== undefined, {
    message: 'Provide a status or role to update',
  });

export type DelayFlightInput = z.infer<typeof delayFlightSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
