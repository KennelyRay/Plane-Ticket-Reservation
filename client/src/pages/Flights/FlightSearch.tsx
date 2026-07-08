import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { flightApi, type FlightSearchParams } from '../../features/flight/api';
import type { Flight } from '../../types';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });

const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

function FlightCard({ flight }: { flight: Flight }) {
  const { route } = flight;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-shadow">
      <div className="flex-1">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <span className="font-semibold text-sky-700">{flight.airline.name}</span>
          <span>·</span>
          <span>{flight.flightNumber}</span>
          <span>·</span>
          <span>{formatDate(flight.departureTime)}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-slate-800">{formatTime(flight.departureTime)}</div>
            <div className="text-sm text-slate-500">{route.originAirport.iataCode}</div>
          </div>
          <div className="flex-1 flex flex-col items-center px-2">
            <div className="text-xs text-slate-400">{formatDuration(route.durationMinutes)}</div>
            <div className="w-full h-px bg-slate-300 relative my-1">
              <span className="absolute -right-1 -top-1.5 text-slate-400 text-xs">✈</span>
            </div>
            <div className="text-xs text-slate-400">Direct</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-slate-800">{formatTime(flight.arrivalTime)}</div>
            <div className="text-sm text-slate-500">{route.destinationAirport.iataCode}</div>
          </div>
        </div>
      </div>
      <div className="sm:text-right sm:border-l sm:border-slate-100 sm:pl-4">
        <div className="text-2xl font-bold text-sky-700">
          ₱{Number(flight.economyPrice).toLocaleString()}
        </div>
        <div className="text-xs text-slate-400 mb-2">Economy, per passenger</div>
        <button className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium">
          Select
        </button>
      </div>
    </div>
  );
}

export default function FlightSearch() {
  const [form, setForm] = useState({ origin: 'MNL', destination: 'CEB', date: '' });
  const [params, setParams] = useState<FlightSearchParams | null>({ origin: 'MNL', destination: 'CEB' });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['flights', params],
    queryFn: () => flightApi.search(params!),
    enabled: !!params,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams({
      origin: form.origin || undefined,
      destination: form.destination || undefined,
      date: form.date || undefined,
    });
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 uppercase';

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Find your flight</h1>

      <form
        onSubmit={handleSearch}
        className="bg-white rounded-2xl border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 mb-8"
      >
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">FROM (IATA)</label>
          <input
            value={form.origin}
            onChange={(e) => setForm({ ...form, origin: e.target.value.toUpperCase() })}
            className={inputClass}
            placeholder="MNL"
            maxLength={3}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">TO (IATA)</label>
          <input
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value.toUpperCase() })}
            className={inputClass}
            placeholder="CEB"
            maxLength={3}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">DATE</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium"
          >
            Search flights
          </button>
        </div>
      </form>

      {isLoading && <p className="text-slate-500">Searching flights…</p>}
      {isError && <p className="text-red-600">Could not load flights. Is the server running?</p>}

      {data && (
        <>
          <p className="text-sm text-slate-500 mb-4">
            {data.pagination.total} flight{data.pagination.total === 1 ? '' : 's'} found
          </p>
          <div className="space-y-3">
            {data.flights.map((flight) => (
              <FlightCard key={flight.id} flight={flight} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
