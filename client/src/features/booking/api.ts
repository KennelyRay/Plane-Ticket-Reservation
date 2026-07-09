import { api } from '../../services/api';
import type { ApiResponse, Flight } from '../../types';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED';

export interface BoardingPass {
  id: string;
  gate: string | null;
  boardingTime: string;
  seatNumber: string;
  sequenceNumber: number;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  status: 'ISSUED' | 'CHECKED_IN' | 'BOARDED' | 'USED' | 'CANCELLED';
  barcodeData: string;
  boardingPass: BoardingPass | null;
}

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
  ticket: Ticket | null;
}

export type PaymentMethod = 'CARD' | 'GCASH' | 'PAYMAYA';

export interface Payment {
  id: string;
  amount: string;
  currency: string;
  method: PaymentMethod;
  transactionId: string | null;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  paidAt: string | null;
  createdAt: string;
}

export interface Booking {
  id: string;
  bookingReference: string;
  status: BookingStatus;
  totalAmount: string;
  contactEmail: string;
  contactPhone: string | null;
  expiresAt: string | null;
  createdAt: string;
  flight: Flight;
  passengers: BookingPassenger[];
  payments: Payment[];
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

  async checkIn(bookingId: string) {
    const { data } = await api.post<ApiResponse<Booking>>(`/checkin/${bookingId}`);
    return data.data;
  },

  async emailBoardingPass(bookingId: string) {
    const { data } = await api.post<ApiResponse<{ email: string }>>(
      `/checkin/${bookingId}/email`
    );
    return data.data;
  },

  async pay(payload: {
    bookingId: string;
    method: PaymentMethod;
    card?: { holder: string; number: string; expiry: string; cvv: string };
  }) {
    const { data } = await api.post<ApiResponse<Booking>>('/payments', payload);
    return data.data;
  },
};
