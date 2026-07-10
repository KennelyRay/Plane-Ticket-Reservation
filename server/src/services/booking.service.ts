import { CabinClass, Flight } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import { flightRepository } from '../repositories/flight.repository';
import { seatRepository } from '../repositories/seat.repository';
import { bookingRepository } from '../repositories/booking.repository';
import { seatLockStore } from './seatLock.service';
import { emitSeatBooked, emitSeatReleased } from '../sockets';
import { CreateBookingInput } from '../validators/booking.validator';
import { AuthUser } from '../middleware/auth';

// Unambiguous alphabet (no 0/O, 1/I) for booking references like "VF-8KD3QT"
const REF_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export const PAYMENT_WINDOW_MINUTES = 15;

const generateReference = async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    let ref = 'VF-';
    for (let i = 0; i < 6; i++) {
      ref += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
    }
    if (!(await bookingRepository.findByReference(ref))) return ref;
  }
  throw new ApiError(500, 'Could not generate a unique booking reference');
};

const cabinBasePrice = (flight: Flight, cabin: CabinClass) => {
  const economy = Number(flight.economyPrice);
  if (cabin === 'BUSINESS' || cabin === 'FIRST') {
    const premium = cabin === 'FIRST' ? flight.firstClassPrice : flight.businessPrice;
    return premium !== null ? Number(premium) : Number(flight.businessPrice ?? economy);
  }
  return economy;
};

export const bookingService = {
  async createBooking(userId: string, input: CreateBookingInput) {
    const flight = await flightRepository.findById(input.flightId);
    if (!flight) throw ApiError.notFound('Flight not found');
    if (flight.status === 'CANCELLED') throw ApiError.badRequest('This flight has been cancelled');
    if (flight.departureTime <= new Date())
      throw ApiError.badRequest('This flight has already departed');

    const [seats, bookedIds, locks] = await Promise.all([
      seatRepository.findByFlightId(input.flightId),
      seatRepository.findBookedSeatIds(input.flightId),
      seatLockStore.getAllForFlight(input.flightId),
    ]);
    const seatsById = new Map(seats.map((s) => [s.id, s]));

    const now = Date.now();
    for (const p of input.passengers) {
      const seat = seatsById.get(p.seatId);
      if (!seat) throw ApiError.notFound('Seat not found on this flight');
      if (bookedIds.has(p.seatId))
        throw ApiError.conflict(`Seat ${seat.seatNumber} is already booked`);
      const lock = locks.get(p.seatId);
      if (!lock || lock.userId !== userId || lock.expiresAt <= now)
        throw ApiError.conflict(
          `Your hold on seat ${seat.seatNumber} has expired — please reselect it`
        );
    }

    const fares = input.passengers.map((p) => {
      const seat = seatsById.get(p.seatId)!;
      return cabinBasePrice(flight, seat.cabinClass) + Number(seat.extraPrice);
    });
    const totalAmount = fares.reduce((sum, f) => sum + f, 0);

    const bookingReference = await generateReference();

    // Nested create keeps booking + passengers atomic. The booking holds its
    // seats while PENDING; it confirms on payment or expires unpaid.
    const booking = await bookingRepository.create({
      bookingReference,
      user: { connect: { id: userId } },
      flight: { connect: { id: input.flightId } },
      status: 'PENDING',
      expiresAt: new Date(Date.now() + PAYMENT_WINDOW_MINUTES * 60 * 1000),
      totalAmount,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      passengers: {
        create: input.passengers.map((p, i) => ({
          passenger: {
            create: {
              userId,
              title: p.title,
              firstName: p.firstName,
              lastName: p.lastName,
              dateOfBirth: p.dateOfBirth,
              gender: p.gender,
              nationality: p.nationality,
              passportNumber: p.passportNumber,
              passportIssueCountry: p.passportIssueCountry,
            },
          },
          seat: { connect: { id: p.seatId } },
          cabinClass: seatsById.get(p.seatId)!.cabinClass,
          fareAmount: fares[i],
        })),
      },
    });

    for (const p of input.passengers) {
      await seatLockStore.release(input.flightId, p.seatId, userId);
      emitSeatBooked(input.flightId, p.seatId);
    }

    return booking;
  },

  async getMyBookings(userId: string) {
    await bookingRepository.expireStale({ userId });
    return bookingRepository.findByUser(userId);
  },

  async getBooking(id: string, user: AuthUser) {
    await bookingRepository.expireStale({ id });
    const booking = await bookingRepository.findById(id);
    if (!booking) throw ApiError.notFound('Booking not found');
    if (booking.userId !== user.id && user.role !== 'ADMIN')
      throw ApiError.notFound('Booking not found');
    return booking;
  },

  async cancelBooking(id: string, user: AuthUser) {
    const booking = await this.getBooking(id, user);
    if (booking.status === 'CANCELLED') throw ApiError.badRequest('Booking is already cancelled');
    if (booking.status === 'COMPLETED')
      throw ApiError.badRequest('Completed bookings cannot be cancelled');
    if (booking.flight.departureTime <= new Date())
      throw ApiError.badRequest('This flight has already departed');

    const cancelled = await bookingRepository.updateStatus(id, 'CANCELLED');

    // Cancelled seats become available again — notify seat-map viewers
    for (const bp of cancelled.passengers) {
      if (bp.seatId) emitSeatReleased(cancelled.flightId, bp.seatId);
    }

    return cancelled;
  },
};
