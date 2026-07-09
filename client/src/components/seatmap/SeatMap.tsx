import { Fragment } from 'react';
import type { SeatMapSeat } from '../../features/seat/api';

interface SeatMapProps {
  seats: SeatMapSeat[];
  onSeatClick: (seat: SeatMapSeat) => void;
  busySeatId?: string | null;
}

const seatClasses = (seat: SeatMapSeat, busy: boolean, size: string) => {
  // Rounded top = seat back, flatter bottom = cushion, so each cell reads as a seat.
  const base = `${size} rounded-t-[9px] rounded-b-[3px] text-[9px] sm:text-[10px] font-bold border flex items-center justify-center transition-all duration-150 select-none`;
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

function SeatButton({
  seat,
  busy,
  size,
  onClick,
}: {
  seat: SeatMapSeat;
  busy: boolean;
  size: string;
  onClick: (seat: SeatMapSeat) => void;
}) {
  return (
    <button
      type="button"
      title={`${seat.seatNumber} · ${seat.seatType.toLowerCase()} · +₱${Number(seat.extraPrice).toLocaleString()}`}
      className={seatClasses(seat, busy, size)}
      disabled={seat.status === 'BOOKED' || (seat.status === 'LOCKED' && !seat.lockedByMe)}
      onClick={() => onClick(seat)}
    >
      {seat.seatNumber}
    </button>
  );
}

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

interface Cabin {
  columns: string[];
  aisleAfter: number;
  rows: number[];
  byRowCol: Map<string, SeatMapSeat>;
  lastBusinessRow: number;
  hasBusiness: boolean;
  onSeatClick: (seat: SeatMapSeat) => void;
  busySeatId?: string | null;
}

const wingFill = 'bg-gradient-to-br from-slate-200 to-slate-300/70 border border-slate-300/60';

// ─────────────── Horizontal airplane (desktop) ───────────────

const H = { wing: 116, nose: 142, tail: 168 }; // px of room around the fuselage

function HorizontalPlane(cabin: Cabin) {
  const { columns, aisleAfter, rows, byRowCol, lastBusinessRow, hasBusiness, onSeatClick, busySeatId } = cabin;

  return (
    <div className="hidden lg:block overflow-x-auto pb-2">
      <div
        className="relative mx-auto w-fit"
        style={{ padding: `${H.wing}px ${H.tail}px ${H.wing}px ${H.nose}px` }}
      >
        {/* ── Airframe (decorative) ── */}
        {/* Fuselage tube: rounded-full left cap is the nose; the right narrows into
            a tapered tail cone drawn separately. */}
        <div
          aria-hidden
          className="absolute rounded-l-full rounded-r-[28px] bg-gradient-to-b from-slate-50 via-white to-slate-50 border border-slate-200 shadow-soft"
          style={{ top: H.wing, bottom: H.wing, left: 0, right: 66 }}
        />
        {/* Tapered tail cone */}
        <div
          aria-hidden
          className="absolute bg-gradient-to-r from-slate-100 to-slate-200 border border-slate-200"
          style={{
            top: H.wing + 34,
            bottom: H.wing + 34,
            right: 0,
            width: 120,
            clipPath: 'polygon(0 0, 0 100%, 100% 50%)',
          }}
        />
        {/* Vertical stabilizer (tail fin), swept back */}
        <div
          aria-hidden
          className={`absolute ${wingFill}`}
          style={{
            top: H.wing - 66,
            right: 92,
            width: 86,
            height: 78,
            clipPath: 'polygon(0 100%, 60% 100%, 100% 0)',
          }}
        />

        {/* Main wings, swept back toward the tail */}
        <div
          aria-hidden
          className={`absolute ${wingFill}`}
          style={{
            top: 4,
            left: '46%',
            transform: 'translateX(-50%)',
            width: 300,
            height: H.wing + 26,
            clipPath: 'polygon(4% 100%, 64% 100%, 100% 0, 42% 0)',
          }}
        />
        <div
          aria-hidden
          className={`absolute ${wingFill}`}
          style={{
            bottom: 4,
            left: '46%',
            transform: 'translateX(-50%)',
            width: 300,
            height: H.wing + 26,
            clipPath: 'polygon(4% 0, 64% 0, 100% 100%, 42% 100%)',
          }}
        />
        {/* Engine nacelles on the wings */}
        <div
          aria-hidden
          className="absolute rounded-full bg-slate-300 border border-slate-400/50"
          style={{ top: H.wing - 34, left: 'calc(46% - 46px)', width: 46, height: 18 }}
        />
        <div
          aria-hidden
          className="absolute rounded-full bg-slate-300 border border-slate-400/50"
          style={{ bottom: H.wing - 34, left: 'calc(46% - 46px)', width: 46, height: 18 }}
        />

        {/* Tailplane (horizontal stabilizers) at the rear */}
        <div
          aria-hidden
          className={`absolute ${wingFill}`}
          style={{
            top: H.wing - 48,
            right: 40,
            width: 128,
            height: 54,
            clipPath: 'polygon(0 100%, 56% 100%, 100% 0, 50% 0)',
          }}
        />
        <div
          aria-hidden
          className={`absolute ${wingFill}`}
          style={{
            bottom: H.wing - 48,
            right: 40,
            width: 128,
            height: 54,
            clipPath: 'polygon(0 0, 56% 0, 100% 100%, 50% 100%)',
          }}
        />

        {/* Cockpit windows near the nose */}
        <div
          aria-hidden
          className="absolute flex flex-col gap-1"
          style={{ left: 40, top: '50%', transform: 'translateY(-50%)' }}
        >
          <span className="w-7 h-2.5 rounded-full bg-slate-300 -rotate-12" />
          <span className="w-7 h-2.5 rounded-full bg-slate-300 rotate-12" />
        </div>

        {/* Nose / tail hints */}
        <span
          aria-hidden
          className="absolute text-[9px] font-bold uppercase tracking-[0.25em] text-slate-400"
          style={{ left: 20, bottom: H.wing - 26 }}
        >
          Nose
        </span>
        <span
          aria-hidden
          className="absolute text-[9px] font-bold uppercase tracking-[0.25em] text-slate-400"
          style={{ right: 22, bottom: H.wing - 26 }}
        >
          Tail
        </span>

        {/* ── Seats ── */}
        <div className="relative flex items-stretch gap-1.5">
          {/* Column letter axis */}
          <div className="flex flex-col items-center gap-1.5 pr-1">
            <span className="h-4" />
            {columns.map((col, i) => (
              <Fragment key={col}>
                <span className="w-4 h-8 flex items-center justify-center text-[10px] font-bold text-slate-400">
                  {col}
                </span>
                {i === aisleAfter && <span className="h-6" />}
              </Fragment>
            ))}
          </div>

          {rows.map((row) => {
            const rowSeats = columns.map((col) => byRowCol.get(`${row}${col}`));
            const isExitRow = rowSeats.some((s) => s?.isEmergencyExit);
            const isCabinDivider = hasBusiness && row === lastBusinessRow + 1;

            return (
              <Fragment key={row}>
                {isCabinDivider && (
                  <div className="flex flex-col items-center justify-center gap-1 mx-1 self-stretch">
                    <span className="flex-1 border-l border-dashed border-slate-300" />
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400 [writing-mode:vertical-rl] rotate-180">
                      Economy
                    </span>
                    <span className="flex-1 border-l border-dashed border-slate-300" />
                  </div>
                )}
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className={`h-4 flex items-center text-[9px] font-extrabold tabular-nums ${
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
                          <SeatButton
                            seat={seat}
                            busy={seat.id === busySeatId}
                            size="w-8 h-8"
                            onClick={onSeatClick}
                          />
                        ) : (
                          <span className="w-8 h-8" />
                        )}
                        {i === aisleAfter && (
                          <span className="h-6 w-8 flex items-center justify-center">
                            {isExitRow && <span className="w-4 border-t-2 border-dashed border-red-300" />}
                          </span>
                        )}
                      </Fragment>
                    );
                  })}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────── Vertical airplane (mobile) ───────────────

const COL_W = 'w-8';
const AISLE_W = 'w-6';
const SIDE_W = 'w-6';

function VerticalPlane(cabin: Cabin) {
  const { columns, aisleAfter, rows, byRowCol, lastBusinessRow, hasBusiness, onSeatClick, busySeatId } = cabin;

  return (
    <div className="lg:hidden overflow-x-auto pb-2">
      <div className="relative mx-auto w-fit py-4">
        {/* Swept wings */}
        <div
          aria-hidden
          className={`absolute right-full top-[46%] w-20 h-40 ${wingFill}`}
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 64%)' }}
        />
        <div
          aria-hidden
          className={`absolute left-full top-[46%] w-20 h-40 ${wingFill}`}
          style={{ clipPath: 'polygon(0 0, 0 100%, 100% 64%)' }}
        />

        {/* Fuselage */}
        <div className="relative z-10 mx-auto w-fit bg-gradient-to-b from-slate-50 via-white to-slate-50 border border-slate-200 rounded-t-[64px] rounded-b-[44px] px-3 pt-4 pb-8 shadow-soft">
          <div className="flex flex-col items-center gap-1 pb-3">
            <span className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-slate-400">
              Cockpit
            </span>
            <div className="flex gap-1">
              <span className="w-6 h-2 rounded-full bg-slate-200" />
              <span className="w-6 h-2 rounded-full bg-slate-200" />
            </div>
          </div>

          <div className="flex items-end justify-center gap-1.5 mb-2">
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

          <div className="flex flex-col gap-1.5">
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

                  <div className="flex items-center justify-center gap-1.5">
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
                            <SeatButton
                              seat={seat}
                              busy={seat.id === busySeatId}
                              size="w-8 h-9"
                              onClick={onSeatClick}
                            />
                          ) : (
                            <span className="w-8 h-9" />
                          )}
                          {i === aisleAfter && (
                            <span className={`${AISLE_W} flex items-center justify-center self-stretch`}>
                              {isExitRow && (
                                <span className="h-6 border-l-2 border-dashed border-red-300" />
                              )}
                            </span>
                          )}
                        </Fragment>
                      );
                    })}

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
      </div>
    </div>
  );
}

/**
 * Seat selector shaped like an aircraft. Desktop shows a horizontal plane
 * (nose left, tail right) with swept wings, engines and tailplane; phones get a
 * vertical plane that fits the narrow screen. Both share the same seat cells.
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

  const cabin: Cabin = {
    columns,
    aisleAfter,
    rows,
    byRowCol,
    lastBusinessRow,
    hasBusiness,
    onSeatClick,
    busySeatId,
  };

  return (
    <div className="space-y-5">
      <Legend />
      <HorizontalPlane {...cabin} />
      <VerticalPlane {...cabin} />
    </div>
  );
}
