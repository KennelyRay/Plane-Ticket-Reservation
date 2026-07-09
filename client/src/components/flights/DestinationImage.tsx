import { useState } from 'react';
import { PlaneIcon } from '../ui/icons';

/**
 * Curated destination photos (Wikimedia Commons, served from Wikimedia's CDN).
 * Airports without an entry fall back to a branded gradient banner.
 */
const DESTINATION_IMAGES: Record<string, string> = {
  MNL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Cityscape_of_Manila%2C_2025_%2801%29.jpg/500px-Cityscape_of_Manila%2C_2025_%2801%29.jpg',
  CEB: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Cebu_city_skyline_2025.jpg/500px-Cebu_city_skyline_2025.jpg',
  DVO: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Davao_Poblacion_District_skyline_Bajada_%28Davao_City%3B_08-22-2023%29.jpg/500px-Davao_Poblacion_District_skyline_Bajada_%28Davao_City%3B_08-22-2023%29.jpg',
  ILO: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Mandurriao_Iloilo_City_skyline_2025_%28enhanced%29.jpg/500px-Mandurriao_Iloilo_City_skyline_2025_%28enhanced%29.jpg',
  CRK: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Angelesjf9605_26.JPG/500px-Angelesjf9605_26.JPG',
  ZAM: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Zamboanga_City_Hall_%26_Rizal_Park%2C_Mar_2026.jpg/500px-Zamboanga_City_Hall_%26_Rizal_Park%2C_Mar_2026.jpg',
  GES: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Gensan_Dadiangas_South%2C_P._Acharon_Boulevard%2C_Gensan_Public_Market_drone_%28General_Santos_City%3B_03-24-2026%29.jpg/500px-Gensan_Dadiangas_South%2C_P._Acharon_Boulevard%2C_Gensan_Public_Market_drone_%28General_Santos_City%3B_03-24-2026%29.jpg',
  BCD: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/San_Sebastian_Cathedral_Bacolod_%28Rizal_Street%2C_Bacolod%2C_Negros_Occidental%3B_10-31-2022%29.jpg/500px-San_Sebastian_Cathedral_Bacolod_%28Rizal_Street%2C_Bacolod%2C_Negros_Occidental%3B_10-31-2022%29.jpg',
  CGY: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/CDO_Poblacion%2C_CM_Recto_Avenue-A._Velez%2C_Misamis_Oriental_Provincial_Capitol_drone_%28Cagayan_De_Oro_City%3B_03-21-2026%29.jpg/500px-CDO_Poblacion%2C_CM_Recto_Avenue-A._Velez%2C_Misamis_Oriental_Provincial_Capitol_drone_%28Cagayan_De_Oro_City%3B_03-21-2026%29.jpg',
  KLO: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Kalibo_Pastrana_Park_top_view_%28GM_Reyes%2C_Kalibo%2C_Aklan%3B_04-07-2024%29.jpg/500px-Kalibo_Pastrana_Park_top_view_%28GM_Reyes%2C_Kalibo%2C_Aklan%3B_04-07-2024%29.jpg',
  MPH: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Boracay_White_Beach.png/500px-Boracay_White_Beach.png',
  BSO: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Sabtang_Batanes.jpg/500px-Sabtang_Batanes.jpg',
  NRT: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Skyscrapers_of_Shinjuku_2009_January.jpg/500px-Skyscrapers_of_Shinjuku_2009_January.jpg',
  BKK: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/4Y1A1159_Bangkok_%2833536795515%29.jpg/500px-4Y1A1159_Bangkok_%2833536795515%29.jpg',
  SIN: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Marina_Bay_Sands_%28I%29.jpg/500px-Marina_Bay_Sands_%28I%29.jpg',
  HKG: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Hong_Kong_Skyline_viewed_from_Victoria_Peak.jpg/500px-Hong_Kong_Skyline_viewed_from_Victoria_Peak.jpg',
  ICN: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/%EC%A4%91%ED%99%94%EC%A0%84%EC%9D%98_%EB%82%AE.jpg/500px-%EC%A4%91%ED%99%94%EC%A0%84%EC%9D%98_%EB%82%AE.jpg',
  TAG: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Chocolate_Hills_Bohol.JPG/500px-Chocolate_Hills_Bohol.JPG',
  PPS: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/01/Dos_Palmas_RP.JPG/500px-Dos_Palmas_RP.JPG',
  USU: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Coron_skyline_Tapyas_%28Coron%2C_Palwan%3B_03-16-2024%29.jpg/500px-Coron_skyline_Tapyas_%28Coron%2C_Palwan%3B_03-16-2024%29.jpg',
  BXU: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/MacapagalBridge2.jpg/500px-MacapagalBridge2.jpg',
  PAG: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Pagadian_Dancing_Fountain.JPG/500px-Pagadian_Dancing_Fountain.JPG',
  KUL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Bukit_Bintang_junction_in_2024_2.jpg/500px-Bukit_Bintang_junction_in_2024_2.jpg',
  ENI: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/El_Nido_Bay_December_2018.jpg/500px-El_Nido_Bay_December_2018.jpg',
  BAG: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Baguio_city_proper_overlooking_Burnham-Harrison_side_%28Baguio_city%3B_12-04-2022%29.jpg/500px-Baguio_city_proper_overlooking_Burnham-Harrison_side_%28Baguio_city%3B_12-04-2022%29.jpg',
  IAO: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Siargao_Island%2C_PH%2C_Sentinel-2.jpg/500px-Siargao_Island%2C_PH%2C_Sentinel-2.jpg',
  DGT: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Dumaguete_Belfry_park_view_%28Perdices_Street%2C_Dumaguete%2C_Negros_Oriental%3B_01-19-2023%29.jpg/500px-Dumaguete_Belfry_park_view_%28Perdices_Street%2C_Dumaguete%2C_Negros_Oriental%3B_01-19-2023%29.jpg',
  TAC: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Tacloban_downtown%2C_Avenida_Rizal_%28Tacloban%2C_Leyte%3B_09-08-2022%29.jpg/500px-Tacloban_downtown%2C_Avenida_Rizal_%28Tacloban%2C_Leyte%3B_09-08-2022%29.jpg',
  LAO: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Ilocos_Norte_Capitol_right_side_view_%28JP_Rizal%2C_Laoag%2C_Ilocos_Norte%3B_11-16-2022%29.jpg/500px-Ilocos_Norte_Capitol_right_side_view_%28JP_Rizal%2C_Laoag%2C_Ilocos_Norte%3B_11-16-2022%29.jpg',
  DRP: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Mount_Mayon_Cagsawa_field_view_close-up_%28Busay%2C_Daraga%2C_Albay%3B_04-21-2023%29.jpg/500px-Mount_Mayon_Cagsawa_field_view_close-up_%28Busay%2C_Daraga%2C_Albay%3B_04-21-2023%29.jpg',
};

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
