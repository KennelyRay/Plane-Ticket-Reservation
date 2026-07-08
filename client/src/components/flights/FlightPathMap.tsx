import { useId, useMemo } from 'react';
import type { Airport } from '../../types';

const W = 420;
const H = 260;
const PAD = 36;

// Simplified coastlines as [lat, lon] rings — rough by design, enough to
// read the geography at this size. Off-frame shapes are clipped by the SVG.
const LANDMASSES: [number, number][][] = [
  // Luzon
  [[18.6, 120.8], [18.4, 121.6], [18.3, 122.2], [17.3, 122.3], [16.3, 122.2], [15.7, 121.7], [14.8, 121.9], [14.1, 122.5], [13.9, 123.2], [13.6, 123.9], [12.6, 124.05], [13.0, 123.4], [13.5, 122.7], [13.6, 122.0], [13.5, 121.2], [13.75, 120.6], [14.5, 120.6], [14.8, 120.1], [15.9, 119.9], [16.4, 120.3], [17.6, 120.4], [18.4, 120.55]],
  // Mindoro
  [[13.55, 120.35], [13.5, 121.25], [12.9, 121.5], [12.3, 121.2], [12.25, 120.55], [13.0, 120.35]],
  // Palawan
  [[11.5, 119.9], [11.0, 119.9], [10.2, 119.3], [9.4, 118.5], [8.6, 117.6], [8.35, 117.15], [8.7, 117.3], [9.6, 118.2], [10.5, 118.9], [11.2, 119.4]],
  // Panay
  [[11.85, 122.1], [11.6, 122.6], [11.5, 123.1], [10.9, 123.0], [10.4, 122.6], [10.55, 122.0], [11.2, 121.9]],
  // Negros
  [[10.9, 123.2], [10.5, 123.5], [9.9, 123.3], [9.1, 123.0], [9.15, 122.5], [9.9, 122.4], [10.65, 122.9]],
  // Cebu
  [[11.3, 123.95], [10.6, 123.85], [9.9, 123.35], [9.75, 123.4], [10.4, 123.75], [11.0, 124.1], [11.25, 124.05]],
  // Bohol
  [[10.15, 124.3], [9.95, 124.55], [9.6, 124.4], [9.6, 124.0], [10.0, 123.95]],
  // Leyte
  [[11.55, 124.45], [11.3, 125.0], [10.8, 125.1], [10.1, 125.2], [10.3, 124.8], [10.9, 124.7], [11.35, 124.35]],
  // Samar
  [[12.6, 124.85], [12.45, 125.3], [12.0, 125.45], [11.3, 125.5], [11.1, 125.2], [11.5, 124.9], [12.2, 124.6]],
  // Masbate
  [[12.5, 123.3], [12.2, 123.85], [11.9, 123.6], [12.15, 123.2]],
  // Catanduanes
  [[13.9, 124.1], [13.6, 124.4], [13.5, 124.1], [13.75, 124.0]],
  // Mindanao
  [[9.8, 125.5], [9.4, 125.9], [9.0, 126.25], [7.3, 126.6], [6.3, 126.2], [5.9, 125.3], [6.4, 124.7], [7.2, 124.2], [7.5, 123.4], [6.9, 122.05], [7.7, 122.6], [8.2, 123.1], [8.6, 123.35], [8.4, 123.9], [8.15, 124.2], [8.5, 124.75], [8.85, 125.1], [9.35, 125.5]],
  // Taiwan
  [[25.3, 121.55], [24.4, 121.85], [22.9, 121.2], [21.9, 120.85], [22.5, 120.3], [23.8, 120.15], [25.0, 121.0]],
  // Borneo
  [[7.0, 116.8], [6.0, 117.7], [5.3, 119.2], [4.3, 118.6], [3.0, 117.6], [1.0, 118.0], [-0.5, 117.5], [-2.5, 116.5], [-3.5, 114.5], [-3.0, 111.8], [-1.7, 110.2], [0.0, 109.3], [1.7, 109.6], [3.0, 111.5], [4.5, 114.2], [6.0, 116.1]],
  // Malay peninsula (Thailand → Singapore)
  [[13.7, 100.5], [11.8, 99.8], [9.5, 99.2], [8.3, 98.3], [6.9, 99.6], [5.4, 100.3], [3.8, 100.8], [2.5, 101.3], [1.35, 103.5], [1.5, 104.3], [3.0, 103.5], [4.7, 103.5], [6.2, 102.1], [8.4, 100.2], [9.7, 100.0], [12.5, 100.1], [13.5, 100.9]],
  // Sumatra
  [[5.6, 95.3], [4.5, 97.5], [3.0, 99.2], [1.5, 101.5], [0.0, 103.2], [-1.5, 104.5], [-3.5, 106.0], [-5.6, 105.5], [-5.4, 104.0], [-3.5, 102.0], [-1.5, 100.3], [0.8, 98.6], [3.0, 96.5], [5.0, 95.2]],
  // Indochina
  [[8.6, 104.9], [9.8, 106.6], [10.4, 107.3], [12.0, 109.2], [13.8, 109.3], [16.1, 108.2], [18.0, 106.5], [20.0, 105.9], [20.9, 106.8], [21.6, 107.9], [21.0, 105.0], [18.5, 103.5], [15.5, 104.0], [13.0, 103.0], [11.0, 103.2], [10.4, 104.4], [9.0, 104.5]],
  // South China coast
  [[21.6, 108.0], [21.9, 110.0], [22.1, 111.5], [22.3, 113.2], [22.4, 114.3], [23.0, 116.5], [24.5, 118.2], [26.0, 119.6], [28.0, 121.5], [30.5, 122.2], [31.5, 120.0], [29.0, 116.0], [26.0, 112.0], [23.5, 108.5], [22.3, 106.8]],
  // Hainan
  [[20.05, 110.3], [19.5, 110.9], [18.4, 110.0], [18.8, 108.8], [19.9, 109.3]],
  // Kyushu
  [[33.95, 130.9], [32.7, 130.2], [31.2, 130.5], [31.4, 131.4], [32.8, 131.9], [33.9, 131.6]],
  // Honshu
  [[34.1, 131.0], [34.4, 132.5], [34.6, 135.1], [33.6, 135.8], [34.6, 137.2], [34.9, 138.8], [35.6, 140.0], [35.7, 140.9], [36.9, 140.8], [38.4, 141.1], [39.6, 142.0], [41.3, 141.5], [41.2, 140.4], [40.0, 139.9], [38.0, 138.8], [37.0, 136.7], [35.7, 133.3], [34.5, 131.2]],
  // Shikoku
  [[34.35, 132.9], [33.5, 132.4], [32.8, 133.0], [33.3, 134.3], [34.2, 134.7]],
  // Korea
  [[34.6, 126.3], [34.3, 127.5], [35.1, 129.05], [36.5, 129.45], [38.0, 128.7], [38.3, 127.2], [37.7, 126.5], [36.7, 126.2], [35.3, 126.3]],
];

const niceScaleKm = (maxKm: number) => {
  const options = [10, 25, 50, 100, 200, 250, 500, 1000, 2000];
  let best = options[0];
  for (const o of options) if (o <= maxKm) best = o;
  return best;
};

/**
 * Miniature route map: an equirectangular frame around the two endpoints
 * with simplified coastlines, all other airports as context dots, a curved
 * flight path, scale bar and north indicator. Callers must ensure both
 * endpoints have coordinates.
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
  const uid = useId();
  const seaId = `${uid}-sea`;
  const clipId = `${uid}-clip`;

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
    return { x, y, minLat, maxLat, minLon, maxLon, spanLat, innerH };
  }, [origin, destination]);

  const lonSpan = view.maxLon - view.minLon;
  const gridStep = lonSpan > 20 ? 10 : lonSpan > 10 ? 5 : lonSpan > 5 ? 2 : 1;
  const lonLines: number[] = [];
  for (let l = Math.ceil(view.minLon / gridStep) * gridStep; l < view.maxLon; l += gridStep)
    lonLines.push(l);
  const latLines: number[] = [];
  for (let l = Math.ceil(view.minLat / gridStep) * gridStep; l < view.maxLat; l += gridStep)
    latLines.push(l);

  const landPaths = useMemo(
    () =>
      LANDMASSES.map(
        (ring) =>
          `M ${ring
            .map(([lat, lon]) => `${view.x(lon).toFixed(1)} ${view.y(lat).toFixed(1)}`)
            .join(' L ')} Z`
      ),
    [view]
  );

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
  const labelDots = dots.length <= 7;

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
  const k = len * 0.16;
  const cx = (x1 + x2) / 2 + px * k;
  const cy = (y1 + y2) / 2 + py * k;

  // Bezier midpoint + chord angle for the plane glyph
  const bx = (x1 + 2 * cx + x2) / 4;
  const by = (y1 + 2 * cy + y2) / 4;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  const labelY = (yy: number) => (yy < 40 ? yy + 18 : yy - 11);

  // Scale bar sized to a round number of kilometres
  const kmPerPx = (view.spanLat * 111.32) / view.innerH;
  const scaleKm = niceScaleKm(kmPerPx * 120);
  const scalePx = scaleKm / kmPerPx;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block rounded-xl" aria-hidden>
      <defs>
        <linearGradient id={seaId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eaf3fe" />
          <stop offset="1" stopColor="#d7e8fb" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect width={W} height={H} rx="12" />
        </clipPath>
      </defs>
      <rect width={W} height={H} rx="12" fill={`url(#${seaId})`} />

      <g clipPath={`url(#${clipId})`}>
        {landPaths.map((d, i) => (
          <path key={i} d={d} fill="#e9f1e2" stroke="#c3d9bd" strokeWidth="1" strokeLinejoin="round" />
        ))}

        {lonLines.map((l) => (
          <line key={`lon${l}`} x1={view.x(l)} y1="0" x2={view.x(l)} y2={H} stroke="#94b8fa" strokeWidth="0.5" strokeOpacity="0.35" />
        ))}
        {latLines.map((l) => (
          <line key={`lat${l}`} x1="0" y1={view.y(l)} x2={W} y2={view.y(l)} stroke="#94b8fa" strokeWidth="0.5" strokeOpacity="0.35" />
        ))}

        {dots.map((a) => (
          <g key={a.id}>
            <circle cx={view.x(a.longitude!)} cy={view.y(a.latitude!)} r="2" fill="#64748b" fillOpacity="0.7" />
            {labelDots && (
              <text x={view.x(a.longitude!) + 5} y={view.y(a.latitude!) + 3} fontSize="8" fontWeight="600" fill="#64748b">
                {a.iataCode}
              </text>
            )}
          </g>
        ))}

        <path d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`} fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />

        {/* origin + destination markers */}
        <circle cx={x1} cy={y1} r="6" fill="#fff" stroke="#2563eb" strokeWidth="2.2" />
        <circle cx={x1} cy={y1} r="2.2" fill="#2563eb" />
        <circle cx={x2} cy={y2} r="6" fill="#fff" stroke="#7c3aed" strokeWidth="2.2" />
        <circle cx={x2} cy={y2} r="2.2" fill="#7c3aed" />
        <text x={x1} y={labelY(y1)} textAnchor="middle" fontSize="11" fontWeight="800" fill="#1f4fd0">
          {origin.iataCode}
        </text>
        <text x={x2} y={labelY(y2)} textAnchor="middle" fontSize="11" fontWeight="800" fill="#7c3aed">
          {destination.iataCode}
        </text>

        {/* plane at the arc midpoint */}
        <g transform={`translate(${bx} ${by}) rotate(${angle})`}>
          <circle r="9" fill="#fff" stroke="#c0d4fc" strokeWidth="1" />
          <path
            transform="scale(0.55) translate(-12 -12)"
            d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z"
            fill="#2563eb"
          />
        </g>
      </g>

      {/* scale bar */}
      <g transform={`translate(14 ${H - 14})`}>
        <line x1="0" y1="0" x2={scalePx} y2="0" stroke="#46546b" strokeWidth="1.5" />
        <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke="#46546b" strokeWidth="1.5" />
        <line x1={scalePx} y1="-3.5" x2={scalePx} y2="3.5" stroke="#46546b" strokeWidth="1.5" />
        <text x={scalePx / 2} y="-5" textAnchor="middle" fontSize="9" fontWeight="700" fill="#46546b">
          {scaleKm.toLocaleString()} km
        </text>
      </g>

      {/* north indicator */}
      <g transform={`translate(${W - 20} 24)`}>
        <path d="M0 -9 L4 5 L0 2 L-4 5 Z" fill="#46546b" fillOpacity="0.75" />
        <text y="16" textAnchor="middle" fontSize="9" fontWeight="800" fill="#46546b">
          N
        </text>
      </g>
    </svg>
  );
}
