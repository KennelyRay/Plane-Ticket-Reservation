import { ApiError } from '../utils/ApiError';
import { flightRepository } from '../repositories/flight.repository';
import { seatRepository } from '../repositories/seat.repository';
import { seatLockStore } from './seatLock.service';
import { emitSeatLocked, emitSeatReleased } from '../sockets';

export type SeatStatus = 'AVAILABLE' | 'LOCKED' | 'BOOKED';

export const seatService = {
  async getSeatMap(flightId: string, userId?: string) {
    const flight = await flightRepository.findById(flightId);
    if (!flight) throw ApiError.notFound('Flight not found');

    const [seats, bookedIds, locks] = await Promise.all([
      seatRepository.findByFlightId(flightId),
      seatRepository.findBookedSeatIds(flightId),
      seatLockStore.getAllForFlight(flightId),
    ]);

    const now = Date.now();
    const seatMap = seats.map((seat) => {
      const lock = locks.get(seat.id);
      const isLocked = !!lock && lock.expiresAt > now;
      const status: SeatStatus = bookedIds.has(seat.id) ? 'BOOKED' : isLocked ? 'LOCKED' : 'AVAILABLE';
      return {
        id: seat.id,
        seatNumber: seat.seatNumber,
        row: seat.row,
        column: seat.column,
        cabinClass: seat.cabinClass,
        seatType: seat.seatType,
        isEmergencyExit: seat.isEmergencyExit,
        isPremium: seat.isPremium,
        extraPrice: seat.extraPrice,
        status,
        lockedByMe: isLocked && !!userId && lock!.userId === userId,
        lockExpiresAt: isLocked && !!userId && lock!.userId === userId ? lock!.expiresAt : null,
      };
    });

    return { flight, seats: seatMap };
  },

  async lockSeat(flightId: string, seatId: string, userId: string) {
    const seats = await seatRepository.findByFlightId(flightId);
    const seat = seats.find((s) => s.id === seatId);
    if (!seat) throw ApiError.notFound('Seat not found on this flight');

    const bookedIds = await seatRepository.findBookedSeatIds(flightId);
    if (bookedIds.has(seatId)) throw ApiError.conflict('Seat is already booked');

    const lock = await seatLockStore.acquire(flightId, seatId, userId);
    if (!lock) throw ApiError.conflict('Seat is currently held by another passenger');

    emitSeatLocked(flightId, seatId);
    return { seatId, seatNumber: seat.seatNumber, expiresAt: lock.expiresAt };
  },

  async releaseSeat(flightId: string, seatId: string, userId: string) {
    const released = await seatLockStore.release(flightId, seatId, userId);
    if (!released) throw ApiError.conflict('You do not hold a lock on this seat');
    emitSeatReleased(flightId, seatId);
    return { seatId };
  },
};
