import { z } from 'zod';

const cardSchema = z.object({
  holder: z.string().min(1, 'Cardholder name is required'),
  number: z
    .string()
    .transform((v) => v.replace(/\s/g, ''))
    .pipe(z.string().regex(/^\d{13,19}$/, 'Enter a valid card number')),
  expiry: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Use MM/YY')
    .refine((v) => {
      const [mm, yy] = v.split('/').map(Number);
      return new Date(2000 + yy, mm) > new Date();
    }, 'Card has expired'),
  cvv: z.string().regex(/^\d{3,4}$/, 'Enter a valid CVV'),
});

export const payBookingSchema = z
  .object({
    bookingId: z.string().min(1),
    method: z.enum(['CARD', 'GCASH', 'PAYMAYA']),
    card: cardSchema.optional(),
  })
  .refine((d) => d.method !== 'CARD' || !!d.card, {
    message: 'Card details are required',
    path: ['card'],
  });

export type PayBookingInput = z.infer<typeof payBookingSchema>;
