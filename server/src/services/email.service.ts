import { Resend } from 'resend';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { bookingRepository } from '../repositories/booking.repository';

type BookingWithDetails = NonNullable<Awaited<ReturnType<typeof bookingRepository.findById>>>;
type BookingPassengerWithDetails = BookingWithDetails['passengers'][number];

const resend = env.mail.resendApiKey ? new Resend(env.mail.resendApiKey) : null;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// Times are shown in the airport's local timezone, not the server's.
const fmtTime = (d: Date, tz: string) =>
  d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: tz });

const fmtDate = (d: Date, tz: string) =>
  d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: tz,
  });

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Deterministic barcode stripes from the ticket number — mirrors the on-screen card. */
const barcode = (data: string) =>
  [...data]
    .map((ch) => {
      const w = ((ch.charCodeAt(0) % 3) + 1) * 2;
      return `<span style="display:inline-block;width:${w}px;height:44px;background:#0b1526;margin-right:2px;"></span>`;
    })
    .join('');

const cell = (label: string, value: string) => `
  <td style="font-family:${FONT};padding:0 8px 0 0;">
    <div style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#46546b;">${esc(label)}</div>
    <div style="font-size:15px;font-weight:800;color:#0b1526;">${esc(value)}</div>
  </td>`;

/**
 * One boarding-pass card as email-safe HTML: tables and inline styles only
 * (no flex/grid/svg), so it holds up in Gmail and Outlook.
 */
function passCardHtml(booking: BookingWithDetails, bp: BookingPassengerWithDetails): string {
  const ticket = bp.ticket;
  const pass = ticket?.boardingPass;
  if (!ticket || !pass) return '';
  const { flight } = booking;
  const originTz = flight.route.originAirport.timezone;
  const destTz = flight.route.destinationAirport.timezone;

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto 20px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;border-collapse:separate;overflow:hidden;">
    <tr>
      <td style="background:#2563eb;background:linear-gradient(90deg,#2563eb,#7c3aed);padding:14px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-family:${FONT};font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#ffffff;">&#9992;&#65038; Boarding pass</td>
            <td align="right" style="font-family:${FONT};font-size:12px;font-weight:700;color:#ffffff;">${esc(booking.bookingReference)}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px;">
        <div style="font-family:${FONT};font-size:15px;font-weight:800;color:#0b1526;">${esc(bp.passenger.firstName)} ${esc(bp.passenger.lastName)}</div>
        <div style="font-family:${FONT};font-size:11px;font-weight:600;color:#46546b;margin:2px 0 16px 0;">${esc(flight.airline.name)} &middot; ${esc(flight.flightNumber)} &middot; ${esc(fmtDate(flight.departureTime, originTz))}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-family:${FONT};white-space:nowrap;">
              <div style="font-size:26px;font-weight:800;color:#0b1526;">${esc(flight.route.originAirport.iataCode)}</div>
              <div style="font-size:11px;font-weight:600;color:#46546b;">${esc(fmtTime(flight.departureTime, originTz))}</div>
            </td>
            <td width="100%" style="padding:0 16px;">
              <div style="border-top:2px dotted #cbd5e1;font-size:0;line-height:0;">&nbsp;</div>
            </td>
            <td align="right" style="font-family:${FONT};white-space:nowrap;">
              <div style="font-size:26px;font-weight:800;color:#0b1526;">${esc(flight.route.destinationAirport.iataCode)}</div>
              <div style="font-size:11px;font-weight:600;color:#46546b;">${esc(fmtTime(flight.arrivalTime, destTz))}</div>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
          <tr>
            ${cell('Seat', pass.seatNumber)}
            ${cell('Gate', pass.gate ?? '—')}
            ${cell('Boarding', fmtTime(pass.boardingTime, originTz))}
            ${cell('Seq', String(pass.sequenceNumber).padStart(3, '0'))}
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="border-top:1px dashed #cbd5e1;padding:16px 20px;">
        <div style="line-height:0;">${barcode(ticket.barcodeData)}</div>
        <div style="font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:.08em;color:#46546b;margin-top:8px;">${esc(ticket.ticketNumber)}</div>
      </td>
    </tr>
  </table>`;
}

export function boardingPassEmailHtml(booking: BookingWithDetails): string {
  const { flight } = booking;
  const originTz = flight.route.originAirport.timezone;
  const route = `${flight.route.originAirport.city} (${flight.route.originAirport.iataCode}) → ${flight.route.destinationAirport.city} (${flight.route.destinationAirport.iataCode})`;
  const firstName = booking.passengers[0]?.passenger.firstName ?? 'traveler';
  const cards = booking.passengers
    .filter((bp) => bp.ticket?.boardingPass)
    .map((bp) => passCardHtml(booking, bp))
    .join('\n');

  return `<!doctype html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#f6f8fc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fc;">
    <tr>
      <td style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;">
          <tr>
            <td style="font-family:${FONT};padding-bottom:20px;">
              <div style="font-size:20px;font-weight:800;color:#0b1526;">You're checked in! &#127881;</div>
              <div style="font-size:13px;font-weight:500;color:#46546b;margin-top:6px;line-height:1.5;">
                Hi ${esc(firstName)}, here ${booking.passengers.length === 1 ? 'is your boarding pass' : 'are your boarding passes'} for
                <strong style="color:#0b1526;">${esc(route)}</strong> on
                <strong style="color:#0b1526;">${esc(fmtDate(flight.departureTime, originTz))}</strong>.
                Show this email (or a printed copy) at security and the gate.
              </div>
            </td>
          </tr>
        </table>
        ${cards}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;">
          <tr>
            <td style="font-family:${FONT};font-size:11px;font-weight:500;color:#46546b;padding-top:8px;line-height:1.6;">
              Gates can change — check the airport screens on the day of travel. Boarding closes 15 minutes before departure.<br />
              Booking reference <strong>${esc(booking.bookingReference)}</strong> &middot; Sent by VertixFlights &middot; Fly smarter, book faster.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const emailService = {
  /** False when RESEND_API_KEY is not set — callers can fall back gracefully. */
  isConfigured: resend !== null,

  /** Sends every issued boarding pass in the booking to its contact email. */
  async sendBoardingPass(booking: BookingWithDetails) {
    if (!resend) throw new ApiError(503, 'Email service is not configured');

    const { flight } = booking;
    const { error } = await resend.emails.send({
      from: env.mail.from,
      to: booking.contactEmail,
      subject: `Your boarding pass · ${booking.bookingReference} · ${flight.route.originAirport.iataCode} → ${flight.route.destinationAirport.iataCode}`,
      html: boardingPassEmailHtml(booking),
    });
    if (error) throw new ApiError(502, `Could not send the boarding pass email: ${error.message}`);
  },
};
