import { api } from '../../services/api';
import type { ApiResponse, Pagination } from '../../types';
import type { Booking } from '../booking/api';

export interface AdminFlight {
  id: string;
  flightNumber: string;
  status: string;
  departureTime: string;
  arrivalTime: string;
  gate: string | null;
  terminal: string | null;
  economyPrice: string;
  airline: { name: string; iataCode: string };
  aircraft: { model: string; totalSeats: number };
  route: {
    origin: { iataCode: string; city: string };
    destination: { iataCode: string; city: string };
  };
  bookingsCount: number;
}

export type FlightOpStatus = 'SCHEDULED' | 'BOARDING' | 'DEPARTED' | 'IN_AIR' | 'ARRIVED';

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  isEmailVerified: boolean;
  createdAt: string;
  bookingsCount: number;
}

export interface AdminUserBookings {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  bookings: Booking[];
}

export interface AdminStats {
  totals: {
    users: number;
    flights: number;
    bookings: number;
    revenue: number;
    flightsToday: number;
    newUsers7d: number;
  };
  financials: {
    paidRevenue: number;
    pendingRevenue: number;
    refunded: number;
    netRevenue: number;
    avgBookingValue: number;
  };
  loadFactor: {
    capacity: number;
    seatsSold: number;
    percent: number;
  };
  flightStatusCounts: Record<string, number>;
  bookingStatusCounts: Record<string, number>;
  revenueTrend: Array<{ date: string; revenue: number }>;
  topRoutes: Array<{
    route: string;
    origin: string;
    destination: string;
    bookings: number;
  }>;
  upcomingFlights: AdminFlight[];
  recentBookings: Array<{
    id: string;
    bookingReference: string;
    status: string;
    totalAmount: string;
    createdAt: string;
    user: { firstName: string; lastName: string; email: string };
    flightNumber: string;
    route: string;
  }>;
}

export const adminApi = {
  async stats() {
    const { data } = await api.get<ApiResponse<AdminStats>>('/admin/stats');
    return data.data;
  },

  async listFlights(params: { scope?: 'upcoming' | 'all'; status?: string; page?: number }) {
    const { data } = await api.get<ApiResponse<{ flights: AdminFlight[]; pagination: Pagination }>>(
      '/admin/flights',
      { params }
    );
    return data.data;
  },

  async delayFlight(id: string, minutes: number) {
    const { data } = await api.post<ApiResponse<{ flight: AdminFlight }>>(
      `/admin/flights/${id}/delay`,
      { minutes }
    );
    return data.data.flight;
  },

  async cancelFlight(id: string) {
    const { data } = await api.post<ApiResponse<{ flight: AdminFlight }>>(
      `/admin/flights/${id}/cancel`
    );
    return data.data.flight;
  },

  async reinstateFlight(id: string) {
    const { data } = await api.post<ApiResponse<{ flight: AdminFlight }>>(
      `/admin/flights/${id}/reinstate`
    );
    return data.data.flight;
  },

  async updateFlight(
    id: string,
    input: { gate?: string; terminal?: string; boardingTime?: string | null }
  ) {
    const { data } = await api.patch<ApiResponse<{ flight: AdminFlight }>>(
      `/admin/flights/${id}`,
      input
    );
    return data.data.flight;
  },

  async setFlightStatus(id: string, status: FlightOpStatus) {
    const { data } = await api.post<ApiResponse<{ flight: AdminFlight }>>(
      `/admin/flights/${id}/status`,
      { status }
    );
    return data.data.flight;
  },

  async listUsers(params: { page?: number }) {
    const { data } = await api.get<ApiResponse<{ users: AdminUser[]; pagination: Pagination }>>(
      '/admin/users',
      { params }
    );
    return data.data;
  },

  async updateUser(id: string, input: { status?: AdminUser['status']; role?: string }) {
    const { data } = await api.patch<ApiResponse<{ user: AdminUser }>>(
      `/admin/users/${id}`,
      input
    );
    return data.data.user;
  },

  async userBookings(userId: string) {
    const { data } = await api.get<ApiResponse<AdminUserBookings>>(
      `/admin/users/${userId}/bookings`
    );
    return data.data;
  },

  async checkInBooking(bookingId: string) {
    const { data } = await api.post<ApiResponse<Booking>>(`/admin/bookings/${bookingId}/check-in`);
    return data.data;
  },

  async cancelBooking(bookingId: string) {
    const { data } = await api.post<ApiResponse<Booking>>(`/admin/bookings/${bookingId}/cancel`);
    return data.data;
  },

  async rescheduleBooking(bookingId: string, flightId: string) {
    const { data } = await api.post<ApiResponse<Booking>>(
      `/admin/bookings/${bookingId}/reschedule`,
      { flightId }
    );
    return data.data;
  },
};
