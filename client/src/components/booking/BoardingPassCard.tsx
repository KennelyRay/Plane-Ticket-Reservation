import type { Booking, BookingPassenger } from '../../features/booking/api';
import { PlaneIcon } from '../ui/icons';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

/** Deterministic barcode stripes from the ticket number. */
function Barcode({ data }: { data: string }) {
  const widths = [...data].map((ch) => (ch.charCodeAt(0) % 3) + 1);
  return (
    <div className="flex items-stretch gap-[2px] h-12" aria-label={`Barcode ${data}`}>
      {widths.map((w, i) => (
        <span
          key={i}
          className="bg-ink rounded-[1px]"
          style={{ width: `${w * 1.5}px`, opacity: i % 4 === 3 ? 0.55 : 1 }}
        />
      ))}
    </div>
  );
}

export default function BoardingPassCard({
  booking,
  bp,
}: {
  booking: Booking;
  bp: BookingPassenger;
}) {
  const { flight } = booking;
  const ticket = bp.ticket!;
  const pass = ticket.boardingPass!;

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden animate-fade-up">
      {/* Header strip */}
      <div className="bg-gradient-to-r from-brand-600 to-violet-glow text-white px-5 py-3 flex items-center gap-3">
        <PlaneIcon className="w-4 h-4 -rotate-45" />
        <span className="text-xs font-extrabold uppercase tracking-[0.18em]">Boarding pass</span>
        <span className="ml-auto text-xs font-bold tabular-nums">{booking.bookingReference}</span>
      </div>

      <div className="p-5 flex flex-col sm:flex-row gap-5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-ink truncate">
            {bp.passenger.firstName} {bp.passenger.lastName}
          </p>
          <p className="text-[11px] font-semibold text-ink-soft mb-4">
            {flight.airline.name} · {flight.flightNumber} · {formatDate(flight.departureTime)}
          </p>

          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-extrabold tracking-tight">
                {flight.route.originAirport.iataCode}
              </p>
              <p className="text-[11px] font-semibold text-ink-soft">
                {formatTime(flight.departureTime)}
              </p>
            </div>
            <span className="flex-1 border-t-2 border-dotted border-slate-200 relative">
              <PlaneIcon className="w-3.5 h-3.5 text-brand-500 absolute left-1/2 -translate-x-1/2 -top-[7px] bg-white" />
            </span>
            <div className="text-right">
              <p className="text-2xl font-extrabold tracking-tight">
                {flight.route.destinationAirport.iataCode}
              </p>
              <p className="text-[11px] font-semibold text-ink-soft">
                {formatTime(flight.arrivalTime)}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-3">
            {[
              ['Seat', pass.seatNumber],
              ['Gate', pass.gate ?? '—'],
              ['Boarding', formatTime(pass.boardingTime)],
              ['Seq', String(pass.sequenceNumber).padStart(3, '0')],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[9px] font-bold uppercase tracking-wide text-ink-soft">{label}</p>
                <p className="text-sm font-extrabold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stub */}
        <div className="sm:w-44 shrink-0 sm:border-l border-t sm:border-t-0 border-dashed border-slate-200 sm:pl-5 pt-4 sm:pt-0 flex sm:flex-col items-center justify-center gap-2">
          <Barcode data={ticket.barcodeData} />
          <p className="text-[10px] font-bold text-ink-soft tabular-nums tracking-wider">
            {ticket.ticketNumber}
          </p>
        </div>
      </div>
    </div>
  );
}
