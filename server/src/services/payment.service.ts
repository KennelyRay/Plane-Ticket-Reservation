import { prisma } from '../config/db';
import { ApiError } from '../utils/ApiError';
import { bookingRepository } from '../repositories/booking.repository';
import { ticketService } from './ticket.service';
import { emailService } from './email.service';
import { PayBookingInput } from '../validators/payment.validator';
import { AuthUser } from '../middleware/auth';

const generateTransactionId = () =>
  `DEMO-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export const paymentService = {
  /**
   * Demo gateway: card payments where the number ends in 0000 are declined,
   * everything else settles instantly. Swap for Stripe/PayMongo later.
   */
  async payForBooking(user: AuthUser, input: PayBookingInput) {
    const booking = await bookingRepository.findById(input.bookingId);
    if (!booking || booking.userId !== user.id) throw ApiError.notFound('Booking not found');

    if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED')
      throw ApiError.badRequest('This booking is already paid');
    if (booking.status === 'CANCELLED')
      throw ApiError.badRequest('This booking was cancelled');
    if (booking.status === 'EXPIRED' || (booking.expiresAt && booking.expiresAt <= new Date())) {
      if (booking.status === 'PENDING') await bookingRepository.updateStatus(booking.id, 'EXPIRED');
      throw ApiError.badRequest('The payment window has closed — please book again');
    }

    const transactionId = generateTransactionId();

    if (input.method === 'CARD' && input.card!.number.endsWith('0000')) {
      await bookingRepository.recordPayment(booking.id, {
        amount: booking.totalAmount,
        method: input.method,
        provider: 'demo',
        transactionId,
        status: 'FAILED',
      });
      throw ApiError.badRequest('Payment declined by the card issuer — try a different card');
    }

    const confirmed = await bookingRepository.confirmWithPayment(booking.id, {
      amount: booking.totalAmount,
      method: input.method,
      provider: 'demo',
      transactionId,
      status: 'PAID',
      paidAt: new Date(),
    });

    // The payment has settled — pass issuance/email problems must not fail
    // the request, so this block only logs on error.
    try {
      await ticketService.issueTicketsWithPasses(confirmed);
      const withTickets = (await bookingRepository.findById(confirmed.id))!;

      if (emailService.isConfigured) await emailService.sendBoardingPass(withTickets);
      const route = `${withTickets.flight.route.originAirport.iataCode} → ${withTickets.flight.route.destinationAirport.iataCode}`;
      await prisma.notification.create({
        data: {
          userId: withTickets.userId,
          type: 'BOARDING_REMINDER',
          title: 'Your e-boarding pass',
          message: `Your e-boarding pass for ${route} (${withTickets.flight.flightNumber}) has been sent to ${withTickets.contactEmail}.`,
        },
      });
      return withTickets;
    } catch (err) {
      console.error('Post-payment boarding pass issue/email failed:', err);
      return (await bookingRepository.findById(confirmed.id)) ?? confirmed;
    }
  },
};
