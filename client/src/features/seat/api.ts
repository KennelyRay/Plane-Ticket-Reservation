import { api } from '../../services/api';
import type { ApiResponse, Flight } from '../../types';

export type SeatStatus = 'AVAILABLE' | 'LOCKED' | 'BOOKED';

export interface SeatMapSeat {
  id: string;
  seatNumber: string;
  row: number;
  column: string;
  cabinClass: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  seatType: 'WINDOW' | 'MIDDLE' | 'AISLE';
  isEmergencyExit: boolean;
  isPremium: boolean;
  extraPrice: string;
  status: SeatStatus;
  lockedByMe: boolean;
  lockExpiresAt: number | null;
}

export interface SeatMapResponse {
  flight: Flight;
  seats: SeatMapSeat[];
}

export const seatApi = {
  async getSeatMap(flightId: string) {
    const { data } = await api.get<ApiResponse<SeatMapResponse>>(`/seats/flight/${flightId}`);
    return data.data;
  },

  async lock(flightId: string, seatId: string) {
    const { data } = await api.post<ApiResponse<{ seatId: string; expiresAt: number }>>(
      '/seats/lock',
      { flightId, seatId }
    );
    return data.data;
  },

  async release(flightId: string, seatId: string) {
    const { data } = await api.post<ApiResponse<{ seatId: string }>>('/seats/release', {
      flightId,
      seatId,
    });
    return data.data;
  },
};
