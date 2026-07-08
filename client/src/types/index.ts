export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isEmailVerified: boolean;
  role: string;
}

export interface Airport {
  id: string;
  name: string;
  iataCode: string;
  city: string;
  country: string;
  timezone: string;
}

export interface Airline {
  id: string;
  name: string;
  iataCode: string;
  logoUrl: string | null;
  country: string;
}

export interface FlightRoute {
  id: string;
  durationMinutes: number;
  distanceKm: number | null;
  originAirport: Airport;
  destinationAirport: Airport;
}

export interface Flight {
  id: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  boardingTime: string | null;
  status: string;
  gate: string | null;
  terminal: string | null;
  economyPrice: string;
  businessPrice: string | null;
  firstClassPrice: string | null;
  airline: Airline;
  route: FlightRoute;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
