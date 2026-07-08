import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import { adminRepository } from '../repositories/admin.repository';
import { UpdateUserInput } from '../validators/admin.validator';

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
    const [
      totalUsers,
      totalFlights,
      totalBookings,
      revenueAgg,
      flightsToday,
      statusGroups,
      upcomingFlights,
      recentBookings,
    ] = await adminRepository.getStats();

    return {
      totals: {
        users: totalUsers,
        flights: totalFlights,
        bookings: totalBookings,
        revenue: revenueAgg._sum.amount ?? 0,
        flightsToday,
      },
      flightStatusCounts: Object.fromEntries(
        statusGroups.map((g) => [g.status, g._count.status])
      ),
      upcomingFlights: upcomingFlights.map(toAdminFlight),
      recentBookings: recentBookings.map((b) => ({
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
