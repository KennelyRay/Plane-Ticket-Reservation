import { api } from '../../services/api';
import type { ApiResponse, Flight } from '../../types';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED';

export interface BookingPassenger {
  id: string;
  cabinClass: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  fareAmount: string;
  passenger: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    nationality: string;
    passportNumber: string | null;
  };
  seat: {
    id: string;
    seatNumber: string;
    seatType: 'WINDOW' | 'MIDDLE' | 'AISLE';
  } | null;
}

export interface Booking {
  id: string;
  bookingReference: string;
  status: BookingStatus;
  totalAmount: string;
  contactEmail: string;
  contactPhone: string | null;
  createdAt: string;
  flight: Flight;
  passengers: BookingPassenger[];
}

export interface CreateBookingPayload {
  flightId: string;
  contactEmail: string;
  contactPhone?: string;
  passengers: {
    seatId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string; // YYYY-MM-DD
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    nationality: string;
    passportNumber?: string;
  }[];
}

export const bookingApi = {
  async create(payload: CreateBookingPayload) {
    const { data } = await api.post<ApiResponse<Booking>>('/bookings', payload);
    return data.data;
  },

  async listMine() {
    const { data } = await api.get<ApiResponse<Booking[]>>('/bookings');
    return data.data;
  },

  async get(id: string) {
    const { data } = await api.get<ApiResponse<Booking>>(`/bookings/${id}`);
    return data.data;
  },

  async cancel(id: string) {
    const { data } = await api.post<ApiResponse<Booking>>(`/bookings/${id}/cancel`);
    return data.data;
  },
};
