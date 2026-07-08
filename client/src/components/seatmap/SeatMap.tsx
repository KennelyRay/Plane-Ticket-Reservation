import type { SeatMapSeat } from '../../features/seat/api';

interface SeatMapProps {
  seats: SeatMapSeat[];
  onSeatClick: (seat: SeatMapSeat) => void;
  busySeatId?: string | null;
}

const seatClasses = (seat: SeatMapSeat, busy: boolean) => {
  const base =
    'w-8 h-8 sm:w-9 sm:h-9 rounded-l-md rounded-r-lg text-[9px] sm:text-[10px] font-bold border flex items-center justify-center transition-all duration-150 select-none';
  if (busy) return `${base} bg-slate-200 border-slate-300 text-slate-400 animate-pulse`;
  if (seat.status === 'BOOKED')
    return `${base} bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed`;
  if (seat.lockedByMe)
    return `${base} bg-gradient-to-br from-brand-600 to-violet-glow border-brand-700 text-white shadow-soft scale-110 cursor-pointer`;
  if (seat.status === 'LOCKED')
    return `${base} bg-amber-100 border-amber-300 text-amber-700 cursor-not-allowed`;
  if (seat.cabinClass === 'BUSINESS')
    return `${base} bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400 hover:scale-110 cursor-pointer`;
  if (seat.isPremium)
    return `${base} bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 hover:border-violet-400 hover:scale-110 cursor-pointer`;
  return `${base} bg-white border-slate-200 text-ink-soft hover:bg-brand-50 hover:border-brand-400 hover:text-brand-700 hover:scale-110 cursor-pointer`;
};

function Legend() {
  const items = [
    { label: 'Available', cls: 'bg-white border-slate-300' },
    { label: 'Premium (+fee)', cls: 'bg-violet-50 border-violet-300' },
    { label: 'Business', cls: 'bg-indigo-50 border-indigo-300' },
    { label: 'Your selection', cls: 'bg-gradient-to-br from-brand-600 to-violet-glow border-brand-700' },
    { label: 'Held by others', cls: 'bg-amber-100 border-amber-300' },
    { label: 'Booked', cls: 'bg-slate-200 border-slate-200' },
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-ink-soft">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className={`inline-block w-4 h-4 rounded-[5px] border ${item.cls}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Top-down aircraft, nose on the left. Each aircraft row renders as a
 * vertical stack of seats; the aisle splits the columns in the middle.
 */
export default function SeatMap({ seats, onSeatClick, busySeatId }: SeatMapProps) {
  const columns = [...new Set(seats.map((s) => s.column))].sort(); // A (top/window) → F (bottom/window)
  const aisleAfter = Math.ceil(columns.length / 2) - 1; // 3-3 layout → aisle after index 2
  const rows = [...new Set(seats.map((s) => s.row))].sort((a, b) => a - b);
  const byRowCol = new Map(seats.map((s) => [`${s.row}${s.column}`, s]));

  const lastBusinessRow = Math.max(
    0,
    ...seats.filter((s) => s.cabinClass === 'BUSINESS').map((s) => s.row)
  );

  return (
    <div className="space-y-5">
      <Legend />

      <div className="overflow-x-auto pb-2">
        <div className="relative inline-block min-w-max px-2 py-16">
          {/* Wings */}
          <div
            className="absolute left-[38%] top-3 w-40 h-16 bg-gradient-to-b from-slate-300/80 to-slate-200/60 border border-slate-300/60 rounded-t-2xl rounded-b-sm"
            style={{ clipPath: 'polygon(18% 100%, 60% 0, 78% 0, 100% 100%)' }}
          />
          <div
            className="absolute left-[38%] bottom-3 w-40 h-16 bg-gradient-to-t from-slate-300/80 to-slate-200/60 border border-slate-300/60 rounded-b-2xl rounded-t-sm"
            style={{ clipPath: 'polygon(18% 0, 60% 100%, 78% 100%, 100% 0)' }}
          />
          {/* Tail fins */}
          <div
            className="absolute right-2 top-7 w-20 h-12 bg-gradient-to-b from-slate-300/80 to-slate-200/60 border border-slate-300/60 rounded-t-xl"
            style={{ clipPath: 'polygon(30% 100%, 78% 0, 100% 0, 100% 100%)' }}
          />
          <div
            className="absolute right-2 bottom-7 w-20 h-12 bg-gradient-to-t from-slate-300/80 to-slate-200/60 border border-slate-300/60 rounded-b-xl"
            style={{ clipPath: 'polygon(30% 0, 78% 100%, 100% 100%, 100% 0)' }}
          />

          {/* Fuselage */}
          <div className="relative flex items-stretch">
            {/* Nose / cockpit */}
            <div className="w-24 sm:w-28 rounded-l-full bg-gradient-to-r from-slate-200 to-slate-100 border border-r-0 border-slate-300/70 flex flex-col items-center justify-center gap-2 shadow-soft">
              <span className="w-8 h-2.5 rounded-full bg-brand-950/20 -rotate-12 translate-x-2" />
              <span className="w-8 h-2.5 rounded-full bg-brand-950/20 rotate-12 translate-x-2" />
            </div>

            {/* Cabin */}
            <div className="bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 border-y border-slate-300/70 px-4 sm:px-5 py-5 shadow-soft">
              <div className="flex items-center gap-1.5">
                {/* Column letter axis */}
                <div className="flex flex-col gap-1.5 mr-1.5">
                  <span className="h-4" />
                  {columns.map((col, i) => (
                    <span key={col} className="contents">
                      <span className="w-4 h-8 sm:h-9 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        {col}
                      </span>
                      {i === aisleAfter && <span className="w-4 h-6" />}
                    </span>
                  ))}
                  <span className="h-4" />
                </div>

                {rows.map((row) => {
                  const rowSeats = columns.map((col) => byRowCol.get(`${row}${col}`));
                  const isExitRow = rowSeats.some((s) => s?.isEmergencyExit);
                  const isCabinDivider = lastBusinessRow > 0 && row === lastBusinessRow + 1;

                  return (
                    <span key={row} className="contents">
                      {isCabinDivider && (
                        <div className="self-stretch flex flex-col items-center justify-center mx-1">
                          <span className="flex-1 border-l-2 border-dashed border-slate-300" />
                          <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400 py-1 [writing-mode:vertical-rl]">
                            Economy
                          </span>
                          <span className="flex-1 border-l-2 border-dashed border-slate-300" />
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5 items-center">
                        {/* Exit marker (top) or row number */}
                        <span
                          className={`h-4 flex items-center text-[9px] font-extrabold ${
                            isExitRow ? 'text-red-500' : 'text-slate-400'
                          }`}
                        >
                          {isExitRow ? 'EXIT' : row}
                        </span>

                        {columns.map((col, i) => {
                          const seat = byRowCol.get(`${row}${col}`);
                          return (
                            <span key={col} className="contents">
                              {seat ? (
                                <button
                                  type="button"
                                  title={`${seat.seatNumber} · ${seat.seatType.toLowerCase()} · +₱${Number(seat.extraPrice).toLocaleString()}`}
                                  className={seatClasses(seat, seat.id === busySeatId)}
                                  disabled={
                                    seat.status === 'BOOKED' ||
                                    (seat.status === 'LOCKED' && !seat.lockedByMe)
                                  }
                                  onClick={() => onSeatClick(seat)}
                                >
                                  {seat.seatNumber}
                                </button>
                              ) : (
                                <span className="w-8 h-8 sm:w-9 sm:h-9" />
                              )}
                              {i === aisleAfter && (
                                <span className="w-8 sm:w-9 h-6 flex items-center justify-center">
                                  {isExitRow && (
                                    <span className="w-4 border-t-2 border-dashed border-red-300" />
                                  )}
                                </span>
                              )}
                            </span>
                          );
                        })}

                        {/* Exit marker (bottom) */}
                        <span
                          className={`h-4 flex items-center text-[9px] font-extrabold ${
                            isExitRow ? 'text-red-500' : 'text-transparent'
                          }`}
                        >
                          {isExitRow ? 'EXIT' : row}
                        </span>
                      </div>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Tail cone */}
            <div
              className="w-16 sm:w-20 bg-gradient-to-l from-slate-200 to-slate-100 border border-l-0 border-slate-300/70 shadow-soft"
              style={{ borderRadius: '0 70% 70% 0 / 0 50% 50% 0' }}
            />
          </div>

          <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
            ◀ Front of aircraft
          </p>
        </div>
      </div>
    </div>
  );
}
