import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import { adminRepository } from '../repositories/admin.repository';
import { bookingRepository } from '../repositories/booking.repository';
import { checkinService } from './checkin.service';
import { AuthUser } from '../middleware/auth';
import {
  UpdateFlightInput,
  UpdateUserInput,
  type FlightStatusInput,
} from '../validators/admin.validator';

/** Rolls paid payments into a dense 7-day series (oldest → newest), zero-filling gaps. */
const buildRevenueTrend = (payments: Array<{ paidAt: Date | null; amount: Prisma.Decimal }>) => {
  const days: Array<{ date: string; revenue: number }> = [];
  const byDay = new Map<string, number>();

  for (const p of payments) {
    if (!p.paidAt) continue;
    const key = p.paidAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + Number(p.amount));
  }

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, revenue: byDay.get(key) ?? 0 });
  }

  return days;
};

type FlightWithRelations = Awaited<
  ReturnType<typeof adminRepository.listFlights>
>[0][number];

const toAdminFlight = (flight: FlightWithRelations) => ({
  id: flight.id,
  flightNumber: flight.flightNumber,
  status: flight.status,
  departureTime: flight.departureTime,
  arrivalTime: flight.arrivalTime,
  gate: flight.gate,
  terminal: flight.terminal,
  economyPrice: flight.economyPrice,
  airline: flight.airline,
  aircraft: flight.aircraft,
  route: {
    origin: flight.route.originAirport,
    destination: flight.route.destinationAirport,
  },
  bookingsCount: flight._count.bookings,
});

export const adminService = {
  async getStats() {
    const s = await adminRepository.getStats();

    const paidRevenue = Number(s.revenueAgg._sum.amount ?? 0);
    const pendingRevenue = Number(s.pendingRevenueAgg._sum.totalAmount ?? 0);
    const refunded = Number(s.refundedAgg._sum.amount ?? 0);
    const avgBookingValue = Number(s.avgBookingAgg._avg.totalAmount ?? 0);

    return {
      totals: {
        users: s.totalUsers,
        flights: s.totalFlights,
        bookings: s.totalBookings,
        revenue: paidRevenue,
        flightsToday: s.flightsToday,
        newUsers7d: s.newUsers7d,
      },
      financials: {
        paidRevenue,
        pendingRevenue,
        refunded,
        netRevenue: paidRevenue - refunded,
        avgBookingValue,
      },
      loadFactor: {
        capacity: s.capacitySeats,
        seatsSold: s.seatsSold,
        percent: s.capacitySeats > 0 ? Math.round((s.seatsSold / s.capacitySeats) * 100) : 0,
      },
      flightStatusCounts: Object.fromEntries(
        s.flightStatusGroups.map((g) => [g.status, g._count.status])
      ),
      bookingStatusCounts: Object.fromEntries(
        s.bookingStatusGroups.map((g) => [g.status, g._count.status])
      ),
      revenueTrend: buildRevenueTrend(s.recentPayments),
      topRoutes: s.topRoutes.map((r) => ({
        route: `${r.originCode} → ${r.destCode}`,
        origin: r.originCity,
        destination: r.destCity,
        bookings: Number(r.bookings),
      })),
      upcomingFlights: s.upcomingFlights.map(toAdminFlight),
      recentBookings: s.recentBookings.map((b) => ({
        id: b.id,
        bookingReference: b.bookingReference,
        status: b.status,
        totalAmount: b.totalAmount,
        createdAt: b.createdAt,
        user: b.user,
        flightNumber: b.flight.flightNumber,
        route: `${b.flight.route.originAirport.iataCode} → ${b.flight.route.destinationAirport.iataCode}`,
      })),
    };
  },

  async listFlights(query: { scope?: string; status?: string; page?: string; pageSize?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 10));
    const scope = query.scope === 'all' ? 'all' : 'upcoming';

    const [flights, total] = await adminRepository.listFlights({
      scope,
      status: query.status || undefined,
      page,
      pageSize,
    });

    return {
      flights: flights.map(toAdminFlight),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async delayFlight(flightId: string, minutes: number) {
    const flight = await adminRepository.findFlightById(flightId);
    if (!flight) throw ApiError.notFound('Flight not found');
    if (flight.status === 'CANCELLED')
      throw ApiError.conflict('Cannot delay a cancelled flight — reinstate it first');
    if (['DEPARTED', 'IN_AIR', 'ARRIVED'].includes(flight.status))
      throw ApiError.conflict(`Flight has already ${flight.status.toLowerCase().replace('_', ' ')}`);

    const shift = minutes * 60_000;
    return toAdminFlight(
      await adminRepository.updateFlight(flightId, {
        status: 'DELAYED',
        departureTime: new Date(flight.departureTime.getTime() + shift),
        arrivalTime: new Date(flight.arrivalTime.getTime() + shift),
        ...(flight.boardingTime
          ? { boardingTime: new Date(flight.boardingTime.getTime() + shift) }
          : {}),
      })
    );
  },

  async cancelFlight(flightId: string) {
    const flight = await adminRepository.findFlightById(flightId);
    if (!flight) throw ApiError.notFound('Flight not found');
    if (['DEPARTED', 'IN_AIR', 'ARRIVED'].includes(flight.status))
      throw ApiError.conflict('Cannot cancel a flight that is already en route or arrived');

    return toAdminFlight(
      await adminRepository.updateFlight(flightId, { status: 'CANCELLED' })
    );
  },

  async reinstateFlight(flightId: string) {
    const flight = await adminRepository.findFlightById(flightId);
    if (!flight) throw ApiError.notFound('Flight not found');
    if (flight.status !== 'CANCELLED' && flight.status !== 'DELAYED')
      throw ApiError.conflict('Only cancelled or delayed flights can be reinstated');

    return toAdminFlight(
      await adminRepository.updateFlight(flightId, { status: 'SCHEDULED' })
    );
  },

  async updateFlightDetails(flightId: string, input: UpdateFlightInput) {
    const flight = await adminRepository.findFlightById(flightId);
    if (!flight) throw ApiError.notFound('Flight not found');

    const data: Prisma.FlightUpdateInput = {};
    if (input.gate !== undefined) data.gate = input.gate || null;
    if (input.terminal !== undefined) data.terminal = input.terminal || null;
    if (input.boardingTime !== undefined)
      data.boardingTime = input.boardingTime ? new Date(input.boardingTime) : null;

    return toAdminFlight(await adminRepository.updateFlight(flightId, data));
  },

  async setFlightStatus(flightId: string, status: FlightStatusInput) {
    const flight = await adminRepository.findFlightById(flightId);
    if (!flight) throw ApiError.notFound('Flight not found');
    if (flight.status === 'CANCELLED')
      throw ApiError.conflict('Reinstate the flight before changing its status');

    // Enforce a sensible forward progression through the operational lifecycle.
    const order = ['SCHEDULED', 'BOARDING', 'DEPARTED', 'IN_AIR', 'ARRIVED'];
    const from = order.indexOf(flight.status);
    const to = order.indexOf(status);
    if (from !== -1 && to !== -1 && to < from)
      throw ApiError.conflict(
        `Cannot move a ${flight.status.toLowerCase()} flight back to ${status.toLowerCase()}`
      );

    return toAdminFlight(await adminRepository.updateFlight(flightId, { status }));
  },

  async listUsers(query: { page?: string; pageSize?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 10));

    const [users, total] = await adminRepository.listUsers({ page, pageSize });

    return {
      users: users.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role.name,
        status: u.status,
        isEmailVerified: u.isEmailVerified,
        createdAt: u.createdAt,
        bookingsCount: u._count.bookings,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  /** All bookings for a given customer, for the admin oversight view. */
  async getUserBookings(userId: string) {
    const user = await adminRepository.findUserById(userId);
    if (!user) throw ApiError.notFound('User not found');

    await bookingRepository.expireStale({ userId });
    const bookings = await bookingRepository.findByUser(userId);

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role.name,
      },
      bookings,
    };
  },

  /** Manual (counter) check-in performed by an admin — bypasses the 24h window. */
  async checkInBooking(bookingId: string, actor: AuthUser) {
    return checkinService.checkIn(bookingId, actor, { overrideWindow: true });
  },

  async updateUser(actorId: string, userId: string, input: UpdateUserInput) {
    const user = await adminRepository.findUserById(userId);
    if (!user) throw ApiError.notFound('User not found');
    if (userId === actorId)
      throw ApiError.conflict('You cannot change your own account from the admin panel');

    const data: Prisma.UserUpdateInput = {};
    if (input.status) data.status = input.status;
    if (input.role) {
      const role = await adminRepository.findRoleByName(input.role);
      if (!role) throw ApiError.badRequest(`Unknown role: ${input.role}`);
      data.role = { connect: { id: role.id } };
    }

    const updated = await adminRepository.updateUser(userId, data);
    return {
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      role: updated.role.name,
      status: updated.status,
      isEmailVerified: updated.isEmailVerified,
      createdAt: updated.createdAt,
      bookingsCount: updated._count.bookings,
    };
  },
};
