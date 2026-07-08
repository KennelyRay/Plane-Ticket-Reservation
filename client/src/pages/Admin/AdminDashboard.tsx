import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { adminApi, type AdminFlight, type AdminUser } from '../../features/admin/api';
import { useAuthStore } from '../../features/auth/store';
import { PlaneIcon, TicketIcon } from '../../components/ui/icons';

type Tab = 'overview' | 'flights' | 'users';

const ROLES = [
  'CUSTOMER',
  'TICKETING_STAFF',
  'CHECKIN_STAFF',
  'GATE_AGENT',
  'FLIGHT_OPS',
  'FINANCE',
  'ADMIN',
];

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const statusBadge = (status: string) => {
  const styles: Record<string, string> = {
    SCHEDULED: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    BOARDING: 'bg-sky-50 border-sky-200 text-sky-700',
    DEPARTED: 'bg-slate-100 border-slate-200 text-ink-soft',
    IN_AIR: 'bg-sky-50 border-sky-200 text-sky-700',
    ARRIVED: 'bg-slate-100 border-slate-200 text-ink-soft',
    DELAYED: 'bg-amber-50 border-amber-200 text-amber-700',
    CANCELLED: 'bg-red-50 border-red-200 text-red-700',
    ACTIVE: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    INACTIVE: 'bg-slate-100 border-slate-200 text-ink-soft',
    SUSPENDED: 'bg-red-50 border-red-200 text-red-700',
    PENDING: 'bg-amber-50 border-amber-200 text-amber-700',
    CONFIRMED: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  };
  return `inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${
    styles[status] ?? 'bg-slate-100 border-slate-200 text-ink-soft'
  }`;
};

const actionBtn =
  'px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-xs font-medium text-ink-soft mt-1">{hint}</p>}
    </div>
  );
}

function FlightRoute({ flight }: { flight: AdminFlight }) {
  return (
    <div className="min-w-0">
      <p className="font-bold text-ink text-sm">
        {flight.route.origin.iataCode} → {flight.route.destination.iataCode}
        <span className="ml-2 font-semibold text-ink-soft">{flight.flightNumber}</span>
      </p>
      <p className="text-xs font-medium text-ink-soft truncate">
        {flight.airline.name} · {formatDateTime(flight.departureTime)}
      </p>
    </div>
  );
}

function FlightActions({
  flight,
  onError,
}: {
  flight: AdminFlight;
  onError: (msg: string) => void;
}) {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  const mutation = useMutation({
    mutationFn: (action: () => Promise<AdminFlight>) => action(),
    onSuccess: refresh,
    onError: (err) =>
      onError(
        isAxiosError(err) ? err.response?.data?.message ?? 'Action failed' : 'Action failed'
      ),
  });

  const finished = ['DEPARTED', 'IN_AIR', 'ARRIVED'].includes(flight.status);

  return (
    <div className="flex items-center justify-end gap-1.5 flex-wrap">
      {flight.status !== 'CANCELLED' && (
        <>
          <button
            disabled={mutation.isPending || finished}
            onClick={() => mutation.mutate(() => adminApi.delayFlight(flight.id, 30))}
            className={`${actionBtn} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`}
            title="Delay departure and arrival by 30 minutes"
          >
            +30m
          </button>
          <button
            disabled={mutation.isPending || finished}
            onClick={() => mutation.mutate(() => adminApi.delayFlight(flight.id, 120))}
            className={`${actionBtn} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`}
            title="Delay departure and arrival by 2 hours"
          >
            +2h
          </button>
          <button
            disabled={mutation.isPending || finished}
            onClick={() => mutation.mutate(() => adminApi.cancelFlight(flight.id))}
            className={`${actionBtn} border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}
          >
            Cancel
          </button>
        </>
      )}
      {(flight.status === 'CANCELLED' || flight.status === 'DELAYED') && (
        <button
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(() => adminApi.reinstateFlight(flight.id))}
          className={`${actionBtn} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
        >
          Reinstate
        </button>
      )}
    </div>
  );
}

function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 mt-4 text-sm font-semibold">
      <button
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className={`${actionBtn} border-slate-200 bg-white text-ink-soft hover:bg-slate-50`}
      >
        ← Prev
      </button>
      <span className="text-xs text-ink-soft tabular-nums">
        {page} / {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className={`${actionBtn} border-slate-200 bg-white text-ink-soft hover:bg-slate-50`}
      >
        Next →
      </button>
    </div>
  );
}

// ─────────────────────────── Tabs ───────────────────────────

function OverviewTab() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'stats'], queryFn: adminApi.stats });

  if (isLoading || !data)
    return <div className="h-48 bg-white rounded-2xl border border-slate-200/80 animate-pulse" />;

  const { totals, flightStatusCounts, upcomingFlights, recentBookings } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard label="Users" value={totals.users.toLocaleString()} />
        <StatCard label="Flights" value={totals.flights.toLocaleString()} />
        <StatCard label="Bookings" value={totals.bookings.toLocaleString()} />
        <StatCard label="Revenue" value={`₱${Number(totals.revenue).toLocaleString()}`} hint="Paid payments" />
        <StatCard label="Flights today" value={totals.flightsToday.toLocaleString()} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft mb-3">
          Fleet status
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(flightStatusCounts).map(([status, count]) => (
            <span key={status} className={statusBadge(status)}>
              {status.replace('_', ' ')} · {count}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ink-soft mb-4">
            <PlaneIcon className="w-3.5 h-3.5" /> Departing in the next 48h
          </p>
          {upcomingFlights.length === 0 ? (
            <p className="text-sm font-medium text-ink-soft">No upcoming departures.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcomingFlights.map((f) => (
                <li key={f.id} className="py-2.5 flex items-center justify-between gap-3">
                  <FlightRoute flight={f} />
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-semibold text-ink-soft">
                      {f.bookingsCount} bkg
                    </span>
                    <span className={statusBadge(f.status)}>{f.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ink-soft mb-4">
            <TicketIcon className="w-3.5 h-3.5" /> Recent bookings
          </p>
          {recentBookings.length === 0 ? (
            <p className="text-sm font-medium text-ink-soft">
              No bookings yet — they'll appear here once the booking flow ships.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentBookings.map((b) => (
                <li key={b.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm">
                      {b.bookingReference}
                      <span className="ml-2 font-semibold text-ink-soft">{b.route}</span>
                    </p>
                    <p className="text-xs font-medium text-ink-soft truncate">
                      {b.user.firstName} {b.user.lastName} · ₱
                      {Number(b.totalAmount).toLocaleString()}
                    </p>
                  </div>
                  <span className={statusBadge(b.status)}>{b.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function FlightsTab({ onError }: { onError: (msg: string) => void }) {
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState<'upcoming' | 'all'>('upcoming');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'flights', scope, page],
    queryFn: () => adminApi.listFlights({ scope, page }),
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
          Flight control
        </p>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-bold">
          {(['upcoming', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setScope(s);
                setPage(1);
              }}
              className={`px-3 py-1.5 capitalize ${
                scope === s ? 'bg-brand-600 text-white' : 'bg-white text-ink-soft hover:bg-slate-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="h-64 animate-pulse bg-slate-50 rounded-xl" />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-ink-soft border-b border-slate-100">
                  <th className="py-2.5 pr-4">Flight</th>
                  <th className="py-2.5 pr-4">Aircraft</th>
                  <th className="py-2.5 pr-4">Bookings</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.flights.map((f) => (
                  <tr key={f.id}>
                    <td className="py-3 pr-4">
                      <FlightRoute flight={f} />
                    </td>
                    <td className="py-3 pr-4 text-xs font-medium text-ink-soft whitespace-nowrap">
                      {f.aircraft.model}
                    </td>
                    <td className="py-3 pr-4 text-xs font-semibold tabular-nums">
                      {f.bookingsCount}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={statusBadge(f.status)}>{f.status}</span>
                    </td>
                    <td className="py-3">
                      <FlightActions flight={f} onError={onError} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} totalPages={data.pagination.totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function UsersTab({ onError }: { onError: (msg: string) => void }) {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page],
    queryFn: () => adminApi.listUsers({ page }),
  });

  const mutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { status?: AdminUser['status']; role?: string } }) =>
      adminApi.updateUser(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onError: (err) =>
      onError(
        isAxiosError(err) ? err.response?.data?.message ?? 'Update failed' : 'Update failed'
      ),
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft mb-4">
        User accounts
      </p>

      {isLoading || !data ? (
        <div className="h-64 animate-pulse bg-slate-50 rounded-xl" />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-ink-soft border-b border-slate-100">
                  <th className="py-2.5 pr-4">User</th>
                  <th className="py-2.5 pr-4">Role</th>
                  <th className="py-2.5 pr-4">Bookings</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.users.map((u) => {
                  const isSelf = u.id === me?.id;
                  return (
                    <tr key={u.id}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-brand-600 to-violet-glow text-white text-[10px] font-bold flex items-center justify-center">
                            {u.firstName[0]}
                            {u.lastName[0]}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-ink text-sm truncate">
                              {u.firstName} {u.lastName}
                              {isSelf && (
                                <span className="ml-1.5 text-[10px] font-bold text-brand-600">
                                  (you)
                                </span>
                              )}
                            </p>
                            <p className="text-xs font-medium text-ink-soft truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          value={u.role}
                          disabled={isSelf || mutation.isPending}
                          onChange={(e) =>
                            mutation.mutate({ id: u.id, input: { role: e.target.value } })
                          }
                          className="text-xs font-bold rounded-lg border border-slate-200 bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/60 disabled:opacity-50"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-4 text-xs font-semibold tabular-nums">
                        {u.bookingsCount}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={statusBadge(u.status)}>{u.status}</span>
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end">
                          {u.status === 'SUSPENDED' ? (
                            <button
                              disabled={isSelf || mutation.isPending}
                              onClick={() =>
                                mutation.mutate({ id: u.id, input: { status: 'ACTIVE' } })
                              }
                              className={`${actionBtn} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
                            >
                              Activate
                            </button>
                          ) : (
                            <button
                              disabled={isSelf || mutation.isPending}
                              onClick={() =>
                                mutation.mutate({ id: u.id, input: { status: 'SUSPENDED' } })
                              }
                              className={`${actionBtn} border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager page={page} totalPages={data.pagination.totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}

// ─────────────────────────── Page ───────────────────────────

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [error, setError] = useState<string | null>(null);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'flights', label: 'Flights' },
    { id: 'users', label: 'Users' },
  ];

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  };

  return (
    <div className="animate-fade-up">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-ink-soft mb-2">
        Admin console
      </p>
      <h1 className="text-3xl font-extrabold tracking-tight mb-6">Operations dashboard</h1>

      <div className="flex gap-1.5 mb-6 bg-white rounded-xl border border-slate-200/80 p-1.5 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              tab === t.id
                ? 'bg-gradient-to-r from-brand-600 to-violet-glow text-white shadow-soft'
                : 'text-ink-soft hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium animate-fade-in">
          {error}
        </div>
      )}

      {tab === 'overview' && <OverviewTab />}
      {tab === 'flights' && <FlightsTab onError={showError} />}
      {tab === 'users' && <UsersTab onError={showError} />}
    </div>
  );
}
