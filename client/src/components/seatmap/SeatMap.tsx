import { Fragment } from 'react';
import type { SeatMapSeat } from '../../features/seat/api';

interface SeatMapProps {
  seats: SeatMapSeat[];
  onSeatClick: (seat: SeatMapSeat) => void;
  busySeatId?: string | null;
}

const seatClasses = (seat: SeatMapSeat, busy: boolean) => {
  // Rounded top = seat back, flatter bottom = cushion, so each cell reads as a seat.
  const base =
    'w-8 h-9 sm:w-9 sm:h-10 rounded-t-[10px] rounded-b-[4px] text-[9px] sm:text-[10px] font-bold border flex items-center justify-center transition-all duration-150 select-none';
  if (busy) return `${base} bg-slate-200 border-slate-300 text-slate-400 animate-pulse`;
  if (seat.status === 'BOOKED')
    return `${base} bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed`;
  if (seat.lockedByMe)
    return `${base} bg-gradient-to-b from-brand-600 to-violet-glow border-brand-700 text-white shadow-soft scale-110 cursor-pointer`;
  if (seat.status === 'LOCKED')
    return `${base} bg-amber-100 border-amber-300 text-amber-700 cursor-not-allowed`;
  if (seat.cabinClass === 'BUSINESS')
    return `${base} bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400 hover:scale-110 active:scale-95 cursor-pointer`;
  if (seat.isPremium)
    return `${base} bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 hover:border-violet-400 hover:scale-110 active:scale-95 cursor-pointer`;
  return `${base} bg-white border-slate-200 text-ink-soft hover:bg-brand-50 hover:border-brand-400 hover:text-brand-700 hover:scale-110 active:scale-95 cursor-pointer`;
};

function Legend() {
  const items = [
    { label: 'Available', cls: 'bg-white border-slate-300' },
    { label: 'Premium (+fee)', cls: 'bg-violet-50 border-violet-300' },
    { label: 'Business', cls: 'bg-indigo-50 border-indigo-300' },
    { label: 'Your selection', cls: 'bg-gradient-to-b from-brand-600 to-violet-glow border-brand-700' },
    { label: 'Held by others', cls: 'bg-amber-100 border-amber-300' },
    { label: 'Booked', cls: 'bg-slate-200 border-slate-200' },
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-ink-soft">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className={`inline-block w-4 h-4 rounded-t-[5px] rounded-b-[2px] border ${item.cls}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

// Column-width tokens kept in sync between the header letters and the seat cells.
const COL_W = 'w-8 sm:w-9';
const AISLE_W = 'w-6 sm:w-7';
const SIDE_W = 'w-6';

/**
 * Vertical top-down cabin: nose/cockpit at the top, rows running down the
 * fuselage with the aisle in the middle, swept wings and tail. The tall,
 * narrow shape fits phone screens; wider decoration is hidden on small screens
 * and the whole cabin can scroll horizontally as a fallback.
 */
export default function SeatMap({ seats, onSeatClick, busySeatId }: SeatMapProps) {
  const columns = [...new Set(seats.map((s) => s.column))].sort();
  const aisleAfter = Math.ceil(columns.length / 2) - 1; // 3-3 → aisle after index 2
  const rows = [...new Set(seats.map((s) => s.row))].sort((a, b) => a - b);
  const byRowCol = new Map(seats.map((s) => [`${s.row}${s.column}`, s]));

  const lastBusinessRow = Math.max(
    0,
    ...seats.filter((s) => s.cabinClass === 'BUSINESS').map((s) => s.row)
  );
  const hasBusiness = lastBusinessRow > 0;

  return (
    <div className="space-y-5">
      <Legend />

      <div className="overflow-x-auto pb-2">
        <div className="relative mx-auto w-fit py-4">
          {/* Swept wings (desktop only — they'd overflow a phone) */}
          <div
            aria-hidden
            className="hidden sm:block absolute right-full top-[46%] w-24 h-40 bg-gradient-to-l from-slate-200 to-slate-100/60 border border-slate-200/70"
            style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 64%)' }}
          />
          <div
            aria-hidden
            className="hidden sm:block absolute left-full top-[46%] w-24 h-40 bg-gradient-to-r from-slate-200 to-slate-100/60 border border-slate-200/70"
            style={{ clipPath: 'polygon(0 0, 0 100%, 100% 64%)' }}
          />

          {/* Fuselage */}
          <div className="relative z-10 mx-auto w-fit bg-gradient-to-b from-slate-50 via-white to-slate-50 border border-slate-200 rounded-t-[64px] rounded-b-[44px] px-3 sm:px-6 pt-4 pb-8 shadow-soft">
            {/* Cockpit / nose */}
            <div className="flex flex-col items-center gap-1 pb-3">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-slate-400">
                Cockpit
              </span>
              <div className="flex gap-1">
                <span className="w-6 h-2 rounded-full bg-slate-200" />
                <span className="w-6 h-2 rounded-full bg-slate-200" />
              </div>
            </div>

            {/* Column letters */}
            <div className="flex items-end justify-center gap-1.5 sm:gap-2 mb-2">
              <span className={SIDE_W} />
              {columns.map((col, i) => (
                <Fragment key={col}>
                  <span className={`${COL_W} text-center text-[10px] font-bold text-slate-400`}>
                    {col}
                  </span>
                  {i === aisleAfter && <span className={AISLE_W} />}
                </Fragment>
              ))}
              <span className={SIDE_W} />
            </div>

            {hasBusiness && (
              <p className="text-center text-[9px] font-extrabold uppercase tracking-[0.25em] text-indigo-400 mb-1.5">
                Business
              </p>
            )}

            {/* Rows */}
            <div className="flex flex-col gap-1.5 sm:gap-2">
              {rows.map((row) => {
                const rowSeats = columns.map((col) => byRowCol.get(`${row}${col}`));
                const isExitRow = rowSeats.some((s) => s?.isEmergencyExit);
                const isCabinDivider = hasBusiness && row === lastBusinessRow + 1;

                return (
                  <Fragment key={row}>
                    {isCabinDivider && (
                      <div className="flex items-center gap-2 my-2">
                        <span className="flex-1 border-t border-dashed border-slate-300" />
                        <span className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
                          Economy
                        </span>
                        <span className="flex-1 border-t border-dashed border-slate-300" />
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                      {/* Left row marker (EXIT for emergency rows) */}
                      <span
                        className={`${SIDE_W} text-center text-[9px] font-extrabold tabular-nums ${
                          isExitRow ? 'text-red-500' : 'text-slate-400'
                        }`}
                      >
                        {isExitRow ? 'EXIT' : row}
                      </span>

                      {columns.map((col, i) => {
                        const seat = byRowCol.get(`${row}${col}`);
                        return (
                          <Fragment key={col}>
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
                              <span className={`${COL_W} h-9 sm:h-10`} />
                            )}
                            {i === aisleAfter && (
                              <span
                                className={`${AISLE_W} flex items-center justify-center self-stretch`}
                              >
                                {isExitRow && (
                                  <span className="h-6 border-l-2 border-dashed border-red-300" />
                                )}
                              </span>
                            )}
                          </Fragment>
                        );
                      })}

                      {/* Right row marker */}
                      <span
                        className={`${SIDE_W} text-center text-[9px] font-extrabold ${
                          isExitRow ? 'text-red-500' : 'text-transparent'
                        }`}
                      >
                        {isExitRow ? 'EXIT' : row}
                      </span>
                    </div>
                  </Fragment>
                );
              })}
            </div>

            <p className="mt-5 text-center text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">
              Tail of aircraft
            </p>
          </div>

          {/* Tail stabilizers (desktop only) */}
          <div
            aria-hidden
            className="hidden sm:block absolute right-full bottom-10 w-14 h-16 bg-gradient-to-l from-slate-200 to-slate-100/50 border border-slate-200/70"
            style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 78%)' }}
          />
          <div
            aria-hidden
            className="hidden sm:block absolute left-full bottom-10 w-14 h-16 bg-gradient-to-r from-slate-200 to-slate-100/50 border border-slate-200/70"
            style={{ clipPath: 'polygon(0 0, 0 100%, 100% 78%)' }}
          />
        </div>
      </div>
    </div>
  );
}
