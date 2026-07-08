import { ApiError } from '../utils/ApiError';
import { flightRepository } from '../repositories/flight.repository';

export const flightService = {
  async search(query: {
    origin?: string;
    destination?: string;
    date?: string;
    page?: string;
    pageSize?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 10));

    const date = query.date ? new Date(query.date) : undefined;
    if (date && Number.isNaN(date.getTime())) {
      throw ApiError.badRequest('Invalid date — use YYYY-MM-DD');
    }

    const [flights, total] = await flightRepository.search({
      originIata: query.origin?.toUpperCase(),
      destinationIata: query.destination?.toUpperCase(),
      date,
      page,
      pageSize,
    });

    return {
      flights,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async getById(id: string) {
    const flight = await flightRepository.findById(id);
    if (!flight) throw ApiError.notFound('Flight not found');
    return flight;
  },
};
