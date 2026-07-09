import type { Booking, BookingPassenger } from './api';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

/** Deterministic barcode stripes from the ticket number — mirrors the on-screen card. */
const barcode = (data: string) =>
  [...data]
    .map((ch) => {
      const w = ((ch.charCodeAt(0) % 3) + 1) * 2;
      return `<span style="display:inline-block;width:${w}px;height:44px;background:#0b1526;margin-right:2px;"></span>`;
    })
    .join('');

/**
 * Opens a print-ready boarding pass in a new window and triggers the print dialog.
 * Self-contained (inline styles) so it prints identically regardless of app CSS.
 */
export function printBoardingPass(booking: Booking, bp: BookingPassenger) {
  const ticket = bp.ticket;
  const pass = ticket?.boardingPass;
  if (!ticket || !pass) return;

  const { flight } = booking;
  const win = window.open('', '_blank', 'width=760,height=560');
  if (!win) return;

  const cell = (label: string, value: string) => `
    <div>
      <div style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#46546b;">${esc(label)}</div>
      <div style="font-size:15px;font-weight:800;color:#0b1526;">${esc(value)}</div>
    </div>`;

  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Boarding pass · ${esc(booking.bookingReference)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0b1526; background: #f6f8fc; }
  .pass { max-width: 640px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
  .head { background: linear-gradient(90deg, #2563eb, #7c3aed); color: #fff; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; }
  .head .t { font-size: 12px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
  .head .r { font-size: 12px; font-weight: 700; }
  .body { padding: 20px; display: flex; gap: 20px; }
  .main { flex: 1; }
  .pax { font-size: 15px; font-weight: 800; }
  .sub { font-size: 11px; font-weight: 600; color: #46546b; margin: 2px 0 16px; }
  .route { display: flex; align-items: center; gap: 16px; }
  .iata { font-size: 26px; font-weight: 800; letter-spacing: -.02em; }
  .time { font-size: 11px; font-weight: 600; color: #46546b; }
  .line { flex: 1; border-top: 2px dotted #cbd5e1; }
  .grid { margin-top: 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .stub { width: 180px; border-left: 1px dashed #cbd5e1; padding-left: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
  .tkt { font-size: 10px; font-weight: 700; letter-spacing: .08em; color: #46546b; }
  @media print { body { padding: 0; background: #fff; } .pass { border: none; } }
</style>
</head>
<body>
  <div class="pass">
    <div class="head">
      <span class="t"><svg width="13" height="13" viewBox="0 0 24 24" fill="#fff" style="vertical-align:-1px;margin-right:6px;transform:rotate(-45deg)"><path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z"/></svg>Boarding pass</span>
      <span class="r">${esc(booking.bookingReference)}</span>
    </div>
    <div class="body">
      <div class="main">
        <div class="pax">${esc(bp.passenger.firstName)} ${esc(bp.passenger.lastName)}</div>
        <div class="sub">${esc(flight.airline.name)} · ${esc(flight.flightNumber)} · ${esc(formatDate(flight.departureTime))}</div>
        <div class="route">
          <div>
            <div class="iata">${esc(flight.route.originAirport.iataCode)}</div>
            <div class="time">${esc(formatTime(flight.departureTime))}</div>
          </div>
          <div class="line"></div>
          <div style="text-align:right;">
            <div class="iata">${esc(flight.route.destinationAirport.iataCode)}</div>
            <div class="time">${esc(formatTime(flight.arrivalTime))}</div>
          </div>
        </div>
        <div class="grid">
          ${cell('Seat', pass.seatNumber)}
          ${cell('Gate', pass.gate ?? '—')}
          ${cell('Boarding', formatTime(pass.boardingTime))}
          ${cell('Seq', String(pass.sequenceNumber).padStart(3, '0'))}
        </div>
      </div>
      <div class="stub">
        <div style="display:flex;align-items:flex-end;height:44px;">${barcode(ticket.barcodeData)}</div>
        <div class="tkt">${esc(ticket.ticketNumber)}</div>
      </div>
    </div>
  </div>
  <script>
    window.onload = function () { window.focus(); window.print(); };
  </script>
</body>
</html>`);
  win.document.close();
}
