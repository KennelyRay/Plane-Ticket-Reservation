import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import {
  adminApi,
  type AdminFlight,
  type AdminStats,
  type AdminUser,
  type FlightOpStatus,
} from '../../features/admin/api';
import { useAuthStore } from '../../features/auth/store';
import type { Booking, BookingPassenger } from '../../features/booking/api';
import { printBoardingPass } from '../../features/booking/printBoardingPass';
import { flightApi } from '../../features/flight/api';
import type { Flight } from '../../types';
import BoardingPassCard from '../../components/booking/BoardingPassCard';
import { CheckIcon, CheckInIcon, LuggageIcon, PlaneIcon, TicketIcon, XIcon } from '../../components/ui/icons';

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

/** Operational lifecycle: current status → the action that advances it. */
const NEXT_STATUS: Record<string, { to: FlightOpStatus; label: string }> = {
  SCHEDULED: { to: 'BOARDING', label: 'Board' },
  DELAYED: { to: 'BOARDING', label: 'Board' },
  BOARDING: { to: 'DEPARTED', label: 'Depart' },
  DEPARTED: { to: 'IN_AIR', label: 'Mark airborne' },
  IN_AIR: { to: 'ARRIVED', label: 'Mark arrived' },
};

const peso = (n: number | string) => `₱${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

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
    DEPARTED: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    IN_AIR: 'bg-sky-50 border-sky-200 text-sky-700',
    ARRIVED: 'bg-slate-100 border-slate-200 text-ink-soft',
    DELAYED: 'bg-amber-50 border-amber-200 text-amber-700',
    CANCELLED: 'bg-red-50 border-red-200 text-red-700',
    ACTIVE: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    INACTIVE: 'bg-slate-100 border-slate-200 text-ink-soft',
    SUSPENDED: 'bg-red-50 border-red-200 text-red-700',
    PENDING: 'bg-amber-50 border-amber-200 text-amber-700',
    CONFIRMED: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    COMPLETED: 'bg-slate-100 border-slate-200 text-ink-soft',
    EXPIRED: 'bg-slate-100 border-slate-200 text-ink-soft',
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

function CardShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft mb-4">{title}</p>
      {children}
    </div>
  );
}

// ─────────────────────── Overview widgets ───────────────────────

/** Seat load factor — a core airline KPI — as a labelled progress meter. */
function LoadFactorMeter({ loadFactor }: { loadFactor: AdminStats['loadFactor'] }) {
  const { percent, seatsSold, capacity } = loadFactor;
  const tone =
    percent >= 80 ? 'text-emerald-600' : percent >= 50 ? 'text-brand-600' : 'text-amber-600';
  const bar =
    percent >= 80 ? 'bg-emerald-500' : percent >= 50 ? 'bg-brand-600' : 'bg-amber-500';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
          Seat load factor
        </p>
        <p className={`text-2xl font-extrabold tabular-nums ${tone}`}>{percent}%</p>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${bar} transition-[width] duration-500`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <p className="text-xs font-medium text-ink-soft mt-2 tabular-nums">
        {seatsSold.toLocaleString()} of {capacity.toLocaleString()} seats sold on upcoming flights
      </p>
    </div>
  );
}

/** Single-series revenue-over-time: brand-hue bars, rounded ends, per-bar hover. */
function RevenueTrend({ trend }: { trend: AdminStats['revenueTrend'] }) {
  const max = Math.max(1, ...trend.map((d) => d.revenue));
  const total = trend.reduce((sum, d) => sum + d.revenue, 0);
  const weekday = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString([], { weekday: 'short' });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
          Revenue · last 7 days
        </p>
        <p className="text-sm font-extrabold tabular-nums">{peso(total)}</p>
      </div>

      {total === 0 ? (
        <div className="h-40 flex items-center justify-center text-sm font-medium text-ink-soft">
          No paid revenue in the last 7 days.
        </div>
      ) : (
        <div className="flex items-end gap-2 h-40">
          {trend.map((d) => {
            const pct = (d.revenue / max) * 100;
            return (
              <div key={d.date} className="group relative flex-1 flex flex-col items-center gap-2">
                <div className="relative w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-[4px] bg-brand-600 group-hover:bg-brand-700 transition-colors"
                    style={{ height: `${Math.max(pct, d.revenue > 0 ? 3 : 0)}%` }}
                  />
                  {/* hover tooltip */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 whitespace-nowrap rounded-lg bg-ink text-white text-[11px] font-semibold px-2 py-1 shadow-lift">
                    {weekday(d.date)} · {peso(d.revenue)}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-ink-soft">{weekday(d.date)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FinancialsCard({ financials }: { financials: AdminStats['financials'] }) {
  const rows = [
    { label: 'Paid revenue', value: peso(financials.paidRevenue), tone: 'text-emerald-600' },
    { label: 'Pending (unpaid)', value: peso(financials.pendingRevenue), tone: 'text-amber-600' },
    { label: 'Refunded', value: `−${peso(financials.refunded)}`, tone: 'text-red-600' },
    { label: 'Avg booking value', value: peso(financials.avgBookingValue), tone: 'text-ink' },
  ];
  return (
    <CardShell title="Financials">
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink-soft">{r.label}</span>
            <span className={`text-sm font-extrabold tabular-nums ${r.tone}`}>{r.value}</span>
          </li>
        ))}
        <li className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-sm font-bold text-ink">Net revenue</span>
          <span className="text-base font-extrabold tabular-nums text-ink">
            {peso(financials.netRevenue)}
          </span>
        </li>
      </ul>
    </CardShell>
  );
}

function StatusChips({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0)
    return <p className="text-sm font-medium text-ink-soft">Nothing to show yet.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([status, count]) => (
        <span key={status} className={statusBadge(status)}>
          {status.replace(/_/g, ' ')} · {count}
        </span>
      ))}
    </div>
  );
}

function TopRoutes({ routes }: { routes: AdminStats['topRoutes'] }) {
  const max = Math.max(1, ...routes.map((r) => r.bookings));
  return (
    <CardShell title="Top routes by bookings">
      {routes.length === 0 ? (
        <p className="text-sm font-medium text-ink-soft">No bookings yet.</p>
      ) : (
        <ul className="space-y-3">
          {routes.map((r) => (
            <li key={r.route}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-ink">
                  {r.route}
                  <span className="ml-2 text-xs font-medium text-ink-soft">
                    {r.origin} → {r.destination}
                  </span>
                </span>
                <span className="text-xs font-bold tabular-nums text-ink-soft">
                  {r.bookings.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-600 to-violet-glow"
                  style={{ width: `${(r.bookings / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </CardShell>
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

// ─────────────────────── Flight ops controls ───────────────────────

/** Inline gate + terminal assignment. */
function GateCell({ flight, onError }: { flight: AdminFlight; onError: (msg: string) => void }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [gate, setGate] = useState(flight.gate ?? '');
  const [terminal, setTerminal] = useState(flight.terminal ?? '');

  const mutation = useMutation({
    mutationFn: () => adminApi.updateFlight(flight.id, { gate, terminal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setEditing(false);
    },
    onError: (err) =>
      onError(isAxiosError(err) ? err.response?.data?.message ?? 'Update failed' : 'Update failed'),
  });

  if (!editing) {
    const label =
      flight.gate || flight.terminal
        ? `${flight.terminal ? `T${flight.terminal}` : '—'} · ${flight.gate ?? '—'}`
        : 'Set gate';
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs font-semibold text-ink-soft hover:text-brand-700 underline decoration-dotted underline-offset-2"
      >
        {label}
      </button>
    );
  }

  const inputCls =
    'rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/60';

  return (
    <div className="flex items-center gap-1">
      <input
        value={terminal}
        onChange={(e) => setTerminal(e.target.value)}
        placeholder="T"
        className={`${inputCls} w-9`}
      />
      <input
        value={gate}
        onChange={(e) => setGate(e.target.value)}
        placeholder="Gate"
        className={`${inputCls} w-14`}
      />
      <button
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
        aria-label="Save gate and terminal"
        className={`${actionBtn} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
      >
        <CheckIcon className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => {
          setEditing(false);
          setGate(flight.gate ?? '');
          setTerminal(flight.terminal ?? '');
        }}
        aria-label="Cancel edit"
        className={`${actionBtn} border-slate-200 bg-white text-ink-soft hover:bg-slate-50`}
      >
        <XIcon className="w-3.5 h-3.5" />
      </button>
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
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin'] });

  const mutation = useMutation({
    mutationFn: (action: () => Promise<AdminFlight>) => action(),
    onSuccess: refresh,
    onError: (err) =>
      onError(isAxiosError(err) ? err.response?.data?.message ?? 'Action failed' : 'Action failed'),
  });

  const finished = ['DEPARTED', 'IN_AIR', 'ARRIVED'].includes(flight.status);
  const next = NEXT_STATUS[flight.status];

  return (
    <div className="flex items-center justify-end gap-1.5 flex-wrap">
      {next && (
        <button
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(() => adminApi.setFlightStatus(flight.id, next.to))}
          className={`${actionBtn} border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100`}
        >
          {next.label}
        </button>
      )}
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

  const {
    totals,
    financials,
    loadFactor,
    flightStatusCounts,
    bookingStatusCounts,
    revenueTrend,
    topRoutes,
    upcomingFlights,
    recentBookings,
  } = data;

  return (
    <div className="space-y-6">
      {/* Headline KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Net revenue" value={peso(financials.netRevenue)} hint="Paid − refunds" />
        <StatCard
          label="Bookings"
          value={totals.bookings.toLocaleString()}
          hint={`${peso(financials.avgBookingValue)} avg value`}
        />
        <StatCard
          label="Users"
          value={totals.users.toLocaleString()}
          hint={`+${totals.newUsers7d} this week`}
        />
        <StatCard
          label="Flights today"
          value={totals.flightsToday.toLocaleString()}
          hint={`${totals.flights.toLocaleString()} total`}
        />
      </div>

      {/* Revenue trend + load factor + financials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RevenueTrend trend={revenueTrend} />
        </div>
        <div className="space-y-4">
          <LoadFactorMeter loadFactor={loadFactor} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <FinancialsCard financials={financials} />
        </div>
        <div className="lg:col-span-2">
          <TopRoutes routes={topRoutes} />
        </div>
      </div>

      {/* Status breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardShell title="Fleet status">
          <StatusChips counts={flightStatusCounts} />
        </CardShell>
        <CardShell title="Booking status">
          <StatusChips counts={bookingStatusCounts} />
        </CardShell>
      </div>

      {/* Operational lists */}
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
                    <span className="text-xs font-semibold text-ink-soft">{f.bookingsCount} bkg</span>
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
            <p className="text-sm font-medium text-ink-soft">No bookings yet.</p>
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
                      {b.user.firstName} {b.user.lastName} · {peso(b.totalAmount)}
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
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Flight control</p>
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
                  <th className="py-2.5 pr-4">Gate · Term</th>
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
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <GateCell flight={f} onError={onError} />
                    </td>
                    <td className="py-3 pr-4 text-xs font-semibold tabular-nums">{f.bookingsCount}</td>
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

/** Full-screen overlay that previews a passenger's boarding pass on screen. */
function BoardingPassPreview({
  booking,
  bp,
  onClose,
}: {
  booking: Booking;
  bp: BookingPassenger;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <BoardingPassCard booking={booking} bp={bp} />
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => printBoardingPass(booking, bp)}
            className="h-10 px-5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-violet-glow shadow-soft hover:shadow-lift transition-all"
          >
            Print
          </button>
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-xl text-sm font-bold text-white/90 border border-white/40 hover:bg-white/10 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/** Inline flight picker for rescheduling a booking to another flight on the same route. */
function ReschedulePanel({
  booking,
  onMove,
  moving,
}: {
  booking: Booking;
  onMove: (flightId: string) => void;
  moving: boolean;
}) {
  const origin = booking.flight.route.originAirport.iataCode;
  const destination = booking.flight.route.destinationAirport.iataCode;
  const [date, setDate] = useState(() =>
    new Date(booking.flight.departureTime).toLocaleDateString('en-CA')
  );

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reschedule-search', origin, destination, date],
    queryFn: () => flightApi.search({ origin, destination, date, sort: 'departure' }),
  });

  const options = (data?.flights ?? []).filter(
    (f: Flight) => f.id !== booking.flight.id && new Date(f.departureTime) > new Date()
  );

  return (
    <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3.5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
          Reschedule · {origin} → {destination}
        </p>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/60"
        />
      </div>

      {isLoading ? (
        <div className="h-20 animate-pulse bg-white/60 rounded-lg" />
      ) : options.length === 0 ? (
        <p className="text-xs font-medium text-ink-soft py-2">
          No other flights on this route for {new Date(`${date}T00:00:00`).toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
          })}
          . Try another date.
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-56 overflow-y-auto">
          {options.map((f: Flight) => (
            <li
              key={f.id}
              className="flex items-center gap-3 bg-white rounded-lg border border-slate-200/80 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">
                  {new Date(f.departureTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {' – '}
                  {new Date(f.arrivalTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  <span className="ml-2 text-xs font-semibold text-ink-soft">{f.flightNumber}</span>
                </p>
                <p className="text-[11px] font-medium text-ink-soft">
                  {f.airline.name} · from ₱{Number(f.economyPrice).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => onMove(f.id)}
                disabled={moving}
                className={`${actionBtn} border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100`}
              >
                {moving ? 'Moving…' : 'Move here'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Per-booking panel inside the user drawer: passengers, passes, check-in, cancel, reschedule. */
function AdminBookingCard({
  booking,
  userId,
  onError,
}: {
  booking: Booking;
  userId: string;
  onError: (msg: string) => void;
}) {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<BookingPassenger | null>(null);
  const [rescheduling, setRescheduling] = useState(false);

  const { flight } = booking;
  const departed = new Date(flight.departureTime) <= new Date();
  const active = booking.status === 'CONFIRMED' || booking.status === 'PENDING';
  const allCheckedIn =
    booking.passengers.length > 0 &&
    booking.passengers.every((p) => p.ticket?.status === 'CHECKED_IN');
  const canCheckIn = booking.status === 'CONFIRMED' && !departed && !allCheckedIn;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'user-bookings', userId] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
  };
  const fail = (err: unknown, fallback: string) =>
    onError(isAxiosError(err) ? err.response?.data?.message ?? fallback : fallback);

  const checkIn = useMutation({
    mutationFn: () => adminApi.checkInBooking(booking.id),
    onSuccess: refresh,
    onError: (err) => fail(err, 'Check-in failed'),
  });

  const cancel = useMutation({
    mutationFn: () => adminApi.cancelBooking(booking.id),
    onSuccess: refresh,
    onError: (err) => fail(err, 'Could not cancel the booking'),
  });

  const reschedule = useMutation({
    mutationFn: (flightId: string) => adminApi.rescheduleBooking(booking.id, flightId),
    onSuccess: () => {
      setRescheduling(false);
      refresh();
    },
    onError: (err) => fail(err, 'Could not reschedule the booking'),
  });

  const busy = checkIn.isPending || cancel.isPending || reschedule.isPending;

  return (
    <div className="rounded-xl border border-slate-200/80 p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-3">
        <span className="text-sm font-extrabold tabular-nums text-brand-700">
          {booking.bookingReference}
        </span>
        <span className="text-sm font-bold text-ink">
          {flight.route.originAirport.city} → {flight.route.destinationAirport.city}
        </span>
        <span className="text-xs font-medium text-ink-soft">
          {flight.airline.name} · {flight.flightNumber} · {formatDateTime(flight.departureTime)}
        </span>
        <span className={`ml-auto ${statusBadge(booking.status)}`}>{booking.status}</span>
      </div>

      <ul className="divide-y divide-slate-100 border-y border-slate-100">
        {booking.passengers.map((bp: BookingPassenger) => {
          const checkedIn = bp.ticket?.status === 'CHECKED_IN';
          const hasPass = Boolean(bp.ticket?.boardingPass);
          return (
            <li key={bp.id} className="py-2.5 flex items-center gap-3">
              <span className="w-9 h-9 shrink-0 rounded-lg bg-gradient-to-br from-brand-600 to-violet-glow text-white text-[11px] font-bold flex items-center justify-center">
                {bp.seat?.seatNumber ?? '—'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink truncate">
                  {bp.passenger.firstName} {bp.passenger.lastName}
                </p>
                <p className="text-xs font-medium text-ink-soft">
                  {bp.cabinClass === 'BUSINESS' ? 'Business' : 'Economy'}
                  {bp.seat && ` · seat ${bp.seat.seatNumber}`}
                </p>
              </div>
              {checkedIn ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                  <CheckInIcon className="w-3.5 h-3.5" /> Checked in
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                  Not checked in
                </span>
              )}
              {hasPass && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPreview(bp)}
                    className={`${actionBtn} border-slate-200 bg-white text-ink-soft hover:bg-slate-50`}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => printBoardingPass(booking, bp)}
                    className={`${actionBtn} border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100`}
                  >
                    Print
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
        <span className="text-xs font-semibold text-ink-soft">
          {booking.passengers.length}{' '}
          {booking.passengers.length === 1 ? 'passenger' : 'passengers'} · {peso(booking.totalAmount)}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {canCheckIn && (
            <button
              onClick={() => checkIn.mutate()}
              disabled={busy}
              className={`${actionBtn} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
            >
              {checkIn.isPending ? 'Checking in…' : 'Manual check-in'}
            </button>
          )}
          {active && (
            <button
              onClick={() => setRescheduling((v) => !v)}
              disabled={busy}
              className={`${actionBtn} border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100`}
            >
              {rescheduling ? 'Close' : 'Reschedule'}
            </button>
          )}
          {active && !departed && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Cancel ${booking.bookingReference}? Seats will be released and this cannot be undone.`
                  )
                )
                  cancel.mutate();
              }}
              disabled={busy}
              className={`${actionBtn} border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}
            >
              {cancel.isPending ? 'Cancelling…' : 'Cancel flight'}
            </button>
          )}
        </div>
      </div>

      {rescheduling && (
        <ReschedulePanel
          booking={booking}
          onMove={(flightId) => reschedule.mutate(flightId)}
          moving={reschedule.isPending}
        />
      )}

      {preview && (
        <BoardingPassPreview booking={booking} bp={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

function UserBookingsModal({
  userId,
  onClose,
  onError,
}: {
  userId: string;
  onClose: () => void;
  onError: (msg: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'user-bookings', userId],
    queryFn: () => adminApi.userBookings(userId),
  });

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-ink/40 backdrop-blur-sm p-4 sm:p-8 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200/80 shadow-lift my-auto animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
              Customer bookings
            </p>
            <h2 className="text-lg font-extrabold tracking-tight truncate">
              {data ? `${data.user.firstName} ${data.user.lastName}` : 'Loading…'}
              {data && (
                <span className="ml-2 text-sm font-semibold text-ink-soft">{data.user.email}</span>
              )}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-lg border border-slate-200 text-ink-soft hover:bg-slate-50 flex items-center justify-center"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="h-40 animate-pulse bg-slate-50 rounded-xl" />
          ) : !data || data.bookings.length === 0 ? (
            <div className="text-center py-10">
              <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-slate-100 text-ink-soft flex items-center justify-center">
                <LuggageIcon className="w-7 h-7" />
              </div>
              <p className="font-bold text-ink">No bookings yet</p>
              <p className="text-sm text-ink-soft mt-1">
                This customer hasn't made any reservations.
              </p>
            </div>
          ) : (
            data.bookings.map((b) => (
              <AdminBookingCard key={b.id} booking={b} userId={userId} onError={onError} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function UsersTab({ onError }: { onError: (msg: string) => void }) {
  const [page, setPage] = useState(1);
  const [openUserId, setOpenUserId] = useState<string | null>(null);
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
      onError(isAxiosError(err) ? err.response?.data?.message ?? 'Update failed' : 'Update failed'),
  });

  return (
    <>
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft mb-4">User accounts</p>

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
                        <button
                          onClick={() => setOpenUserId(u.id)}
                          className="flex items-center gap-2.5 min-w-0 text-left group"
                          title="View bookings"
                        >
                          <span className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-brand-600 to-violet-glow text-white text-[10px] font-bold flex items-center justify-center">
                            {u.firstName[0]}
                            {u.lastName[0]}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-ink text-sm truncate group-hover:text-brand-700 transition-colors">
                              {u.firstName} {u.lastName}
                              {isSelf && (
                                <span className="ml-1.5 text-[10px] font-bold text-brand-600">
                                  (you)
                                </span>
                              )}
                            </p>
                            <p className="text-xs font-medium text-ink-soft truncate">{u.email}</p>
                          </div>
                        </button>
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
                        <button
                          onClick={() => setOpenUserId(u.id)}
                          className="font-bold text-brand-600 hover:underline disabled:text-ink-soft disabled:no-underline"
                        >
                          {u.bookingsCount} {u.bookingsCount === 1 ? 'booking' : 'bookings'} →
                        </button>
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
    {openUserId && (
      <UserBookingsModal
        userId={openUserId}
        onClose={() => setOpenUserId(null)}
        onError={onError}
      />
    )}
    </>
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
