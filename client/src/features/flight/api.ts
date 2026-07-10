import { api } from '../../services/api';
import type { Airport, ApiResponse, Flight, Pagination } from '../../types';

export interface FlightSearchParams {
  origin?: string;
  destination?: string;
  date?: string;
  status?: 'upcoming' | 'boarding' | 'departed';
  sort?: 'departure' | 'price' | 'duration';
  page?: number;
  pageSize?: number;
}

export const flightApi = {
  async search(params: FlightSearchParams) {
    const { data } = await api.get<ApiResponse<{ flights: Flight[]; pagination: Pagination }>>(
      '/flights',
      { params }
    );
    return data.data;
  },

  async getById(id: string) {
    const { data } = await api.get<ApiResponse<{ flight: Flight }>>(`/flights/${id}`);
    return data.data.flight;
  },

  async airports() {
    const { data } = await api.get<ApiResponse<{ airports: Airport[] }>>('/airports');
    return data.data.airports;
  },

  async routes() {
    const { data } = await api.get<
      ApiResponse<{ routes: { origin: string; destination: string }[] }>
    >('/airports/routes');
    return data.data.routes;
  },
};
