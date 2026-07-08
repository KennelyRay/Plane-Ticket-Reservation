import { api } from '../../services/api';
import type { ApiResponse, Flight, Pagination } from '../../types';

export interface FlightSearchParams {
  origin?: string;
  destination?: string;
  date?: string;
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
};
