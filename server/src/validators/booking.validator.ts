import { z } from 'zod';

const passengerSchema = z.object({
  seatId: z.string().min(1),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.coerce
    .date()
    .refine((d) => d < new Date(), 'Date of birth must be in the past'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  nationality: z.string().min(1, 'Nationality is required'),
  passportNumber: z.string().optional(),
});

export const createBookingSchema = z.object({
  flightId: z.string().min(1),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().optional(),
  passengers: z
    .array(passengerSchema)
    .min(1, 'At least one passenger is required')
    .max(9, 'A booking can hold at most 9 passengers')
    .refine(
      (list) => new Set(list.map((p) => p.seatId)).size === list.length,
      'Each passenger needs a different seat'
    ),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
