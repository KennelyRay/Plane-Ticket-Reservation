import { z } from 'zod';

export const delayFlightSchema = z.object({
  minutes: z.number().int().min(5, 'Minimum delay is 5 minutes').max(1440, 'Maximum delay is 24 hours'),
});

export const updateFlightSchema = z
  .object({
    gate: z.string().trim().max(10, 'Gate is too long').optional(),
    terminal: z.string().trim().max(10, 'Terminal is too long').optional(),
    boardingTime: z.string().datetime({ message: 'Invalid boarding time' }).nullable().optional(),
  })
  .refine((v) => v.gate !== undefined || v.terminal !== undefined || v.boardingTime !== undefined, {
    message: 'Provide a gate, terminal or boarding time to update',
  });

export const flightStatusSchema = z.object({
  status: z.enum(['SCHEDULED', 'BOARDING', 'DEPARTED', 'IN_AIR', 'ARRIVED']),
});

export const rescheduleBookingSchema = z.object({
  flightId: z.string().min(1, 'Select a flight to reschedule to'),
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
export type UpdateFlightInput = z.infer<typeof updateFlightSchema>;
export type FlightStatusInput = z.infer<typeof flightStatusSchema>['status'];
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
