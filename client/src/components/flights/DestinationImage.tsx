import { useState } from 'react';
import { PlaneIcon } from '../ui/icons';
import { DESTINATION_IMAGES } from './destinationImages';

const GRADIENTS = [
  'from-brand-500 to-violet-glow',
  'from-sky-500 to-brand-600',
  'from-violet-500 to-fuchsia-500',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-blue-700',
];

const gradientFor = (code: string) => {
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
};

/**
 * Destination banner: a real city photo when available, otherwise a deterministic
 * gradient. Either way the city name is overlaid on a dark scrim so the card reads.
 */
export default function DestinationImage({
  airport,
  className = '',
}: {
  airport: { iataCode: string; city: string };
  className?: string;
}) {
  const url = DESTINATION_IMAGES[airport.iataCode];
  const [failed, setFailed] = useState(false);
  const showImage = url && !failed;

  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      {showImage ? (
        <img
          src={url}
          alt={airport.city}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientFor(airport.iataCode)}`} />
      )}

      {/* readability scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-2.5 flex items-center gap-1.5">
        <PlaneIcon className="w-3.5 h-3.5 -rotate-45 text-white/90 shrink-0" />
        <span className="text-white font-extrabold text-sm leading-tight truncate drop-shadow-sm">
          {airport.city}
        </span>
        <span className="ml-auto text-[10px] font-bold tracking-wide text-white/85 shrink-0">
          {airport.iataCode}
        </span>
      </div>
    </div>
  );
}
