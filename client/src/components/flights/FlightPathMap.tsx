import { useId, useMemo } from 'react';
import type { Airport } from '../../types';

const W = 300;
const H = 190;
const PAD = 30;

/**
 * Miniature route map: an equirectangular view framed around the two
 * endpoints, with every other airport plotted as a context dot (the
 * archipelago outline emerges from the dots) and a curved flight path.
 * Callers must ensure both endpoints have coordinates.
 */
export default function FlightPathMap({
  airports,
  origin,
  destination,
}: {
  airports: Airport[];
  origin: Airport;
  destination: Airport;
}) {
  const seaId = useId();
  const view = useMemo(() => {
    const lat1 = origin.latitude!;
    const lon1 = origin.longitude!;
    const lat2 = destination.latitude!;
    const lon2 = destination.longitude!;

    let minLat = Math.min(lat1, lat2);
    let maxLat = Math.max(lat1, lat2);
    let minLon = Math.min(lon1, lon2);
    let maxLon = Math.max(lon1, lon2);
    const padLat = Math.max((maxLat - minLat) * 0.3, 1.2);
    const padLon = Math.max((maxLon - minLon) * 0.3, 1.2);
    minLat -= padLat;
    maxLat += padLat;
    minLon -= padLon;
    maxLon += padLon;

    // Grow the short axis so degrees keep their true proportions on screen
    const cosMid = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
    const innerW = W - PAD * 2;
    const innerH = H - PAD * 2;
    const target = innerW / innerH;
    let spanLat = maxLat - minLat;
    let spanLon = maxLon - minLon;
    if ((spanLon * cosMid) / spanLat < target) {
      const grow = ((target * spanLat) / cosMid - spanLon) / 2;
      minLon -= grow;
      maxLon += grow;
      spanLon = maxLon - minLon;
    } else {
      const grow = ((spanLon * cosMid) / target - spanLat) / 2;
      minLat -= grow;
      maxLat += grow;
      spanLat = maxLat - minLat;
    }

    const x = (lon: number) => PAD + ((lon - minLon) / spanLon) * innerW;
    const y = (lat: number) => PAD + ((maxLat - lat) / spanLat) * innerH;
    return { x, y, minLat, maxLat, minLon, maxLon };
  }, [origin, destination]);

  const gridStep = view.maxLon - view.minLon > 14 ? 5 : view.maxLon - view.minLon > 6 ? 2 : 1;
  const lonLines: number[] = [];
  for (let l = Math.ceil(view.minLon / gridStep) * gridStep; l < view.maxLon; l += gridStep)
    lonLines.push(l);
  const latLines: number[] = [];
  for (let l = Math.ceil(view.minLat / gridStep) * gridStep; l < view.maxLat; l += gridStep)
    latLines.push(l);

  const dots = airports.filter(
    (a) =>
      a.latitude != null &&
      a.longitude != null &&
      a.id !== origin.id &&
      a.id !== destination.id &&
      a.latitude > view.minLat &&
      a.latitude < view.maxLat &&
      a.longitude > view.minLon &&
      a.longitude < view.maxLon
  );

  const x1 = view.x(origin.longitude!);
  const y1 = view.y(origin.latitude!);
  const x2 = view.x(destination.longitude!);
  const y2 = view.y(destination.latitude!);

  // Quadratic arc bowing toward the top of the frame
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  let px = -dy / len;
  let py = dx / len;
  if (py > 0) {
    px = -px;
    py = -py;
  }
  const k = len * 0.18;
  const cx = (x1 + x2) / 2 + px * k;
  const cy = (y1 + y2) / 2 + py * k;

  // Bezier midpoint + chord angle for the plane glyph
  const bx = (x1 + 2 * cx + x2) / 4;
  const by = (y1 + 2 * cy + y2) / 4;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  const labelY = (yy: number) => (yy < 34 ? yy + 16 : yy - 9);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block rounded-xl" aria-hidden>
      <defs>
        <linearGradient id={seaId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eff6ff" />
          <stop offset="1" stopColor="#dbeafe" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} rx="12" fill={`url(#${seaId})`} />

      {lonLines.map((l) => (
        <line key={`lon${l}`} x1={view.x(l)} y1="0" x2={view.x(l)} y2={H} stroke="#bfdbfe" strokeWidth="0.6" strokeOpacity="0.7" />
      ))}
      {latLines.map((l) => (
        <line key={`lat${l}`} x1="0" y1={view.y(l)} x2={W} y2={view.y(l)} stroke="#bfdbfe" strokeWidth="0.6" strokeOpacity="0.7" />
      ))}

      {dots.map((a) => (
        <circle key={a.id} cx={view.x(a.longitude!)} cy={view.y(a.latitude!)} r="1.6" fill="#94a3b8" fillOpacity="0.75" />
      ))}

      <path d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`} fill="none" stroke="#2563eb" strokeWidth="1.8" strokeDasharray="4 4" strokeLinecap="round" />

      {/* origin + destination markers */}
      <circle cx={x1} cy={y1} r="5" fill="#fff" stroke="#2563eb" strokeWidth="2" />
      <circle cx={x1} cy={y1} r="1.8" fill="#2563eb" />
      <circle cx={x2} cy={y2} r="5" fill="#fff" stroke="#7c3aed" strokeWidth="2" />
      <circle cx={x2} cy={y2} r="1.8" fill="#7c3aed" />
      <text x={x1} y={labelY(y1)} textAnchor="middle" fontSize="10" fontWeight="800" fill="#1f4fd0">
        {origin.iataCode}
      </text>
      <text x={x2} y={labelY(y2)} textAnchor="middle" fontSize="10" fontWeight="800" fill="#7c3aed">
        {destination.iataCode}
      </text>

      {/* plane at the arc midpoint */}
      <g transform={`translate(${bx} ${by}) rotate(${angle})`}>
        <circle r="7.5" fill="#fff" stroke="#c0d4fc" strokeWidth="1" />
        <path
          transform="scale(0.42) translate(-12 -12)"
          d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z"
          fill="#2563eb"
        />
      </g>
    </svg>
  );
}
