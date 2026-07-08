import type { SeatMapSeat } from '../../features/seat/api';

interface SeatMapProps {
  seats: SeatMapSeat[];
  onSeatClick: (seat: SeatMapSeat) => void;
  busySeatId?: string | null;
}

const seatClasses = (seat: SeatMapSeat, busy: boolean) => {
  const base =
    'w-9 h-9 sm:w-10 sm:h-10 rounded-t-lg rounded-b-sm text-[10px] sm:text-xs font-bold border flex items-center justify-center transition-all duration-150 select-none';
  if (busy) return `${base} bg-slate-200 border-slate-300 text-slate-400 animate-pulse`;
  if (seat.status === 'BOOKED')
    return `${base} bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed`;
  if (seat.lockedByMe)
    return `${base} bg-gradient-to-br from-brand-600 to-violet-glow border-brand-700 text-white shadow-soft scale-105 cursor-pointer`;
  if (seat.status === 'LOCKED')
    return `${base} bg-amber-100 border-amber-300 text-amber-700 cursor-not-allowed`;
  if (seat.cabinClass === 'BUSINESS')
    return `${base} bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400 hover:scale-105 cursor-pointer`;
  if (seat.isPremium)
    return `${base} bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 hover:border-violet-400 hover:scale-105 cursor-pointer`;
  return `${base} bg-white border-slate-200 text-ink-soft hover:bg-brand-50 hover:border-brand-400 hover:text-brand-700 hover:scale-105 cursor-pointer`;
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

export default function SeatMap({ seats, onSeatClick, busySeatId }: SeatMapProps) {
  const columns = [...new Set(seats.map((s) => s.column))].sort();
  const aisleAfter = Math.ceil(columns.length / 2) - 1; // 3-3 layout → aisle after index 2
  const rows = [...new Set(seats.map((s) => s.row))].sort((a, b) => a - b);
  const byRowCol = new Map(seats.map((s) => [`${s.row}${s.column}`, s]));

  return (
    <div className="space-y-5">
      <Legend />
      <div className="overflow-x-auto pb-2">
        {/* Fuselage */}
        <div className="inline-block bg-gradient-to-b from-slate-100 to-slate-50 rounded-t-[4.5rem] rounded-b-3xl px-6 sm:px-8 pt-14 pb-8 border border-slate-200 shadow-soft">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-6">
            ── Front of aircraft ──
          </p>

          {/* column headers */}
          <div className="flex gap-1.5 mb-3 items-center">
            <span className="w-8" />
            {columns.map((col, i) => (
              <span key={col} className="flex items-center gap-1.5">
                <span className="w-9 sm:w-10 text-center text-xs font-bold text-slate-400">
                  {col}
                </span>
                {i === aisleAfter && <span className="w-7" />}
              </span>
            ))}
          </div>

          {rows.map((row) => {
            const rowSeats = columns.map((col) => byRowCol.get(`${row}${col}`));
            const isExitRow = rowSeats.some((s) => s?.isEmergencyExit);
            return (
              <div key={row}>
                {isExitRow && (
                  <div className="flex justify-between text-[10px] font-extrabold text-red-500 px-1 py-1">
                    <span>◀ EXIT</span>
                    <span>EXIT ▶</span>
                  </div>
                )}
                <div className="flex gap-1.5 mb-1.5 items-center">
                  <span className="w-8 text-xs font-bold text-slate-400 text-right pr-1.5">
                    {row}
                  </span>
                  {columns.map((col, i) => {
                    const seat = byRowCol.get(`${row}${col}`);
                    return (
                      <span key={col} className="flex items-center gap-1.5">
                        {seat ? (
                          <button
                            type="button"
                            title={`${seat.seatNumber} · ${seat.seatType.toLowerCase()}${Number(seat.extraPrice) > 0 ? ` · +₱${Number(seat.extraPrice)}` : ''}`}
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
                          <span className="w-9 sm:w-10" />
                        )}
                        {i === aisleAfter && <span className="w-7" />}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
