import { PrismaClient, CabinClass, SeatType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ROLES = [
  { name: 'GUEST', description: 'Unauthenticated visitor' },
  { name: 'CUSTOMER', description: 'Registered passenger' },
  { name: 'TICKETING_STAFF', description: 'Manages bookings and tickets' },
  { name: 'CHECKIN_STAFF', description: 'Handles passenger check-in' },
  { name: 'GATE_AGENT', description: 'Boarding and gate operations' },
  { name: 'FLIGHT_OPS', description: 'Flight operations management' },
  { name: 'FINANCE', description: 'Payments, refunds and reports' },
  { name: 'ADMIN', description: 'System administrator' },
];

const AIRPORTS = [
  { name: 'Ninoy Aquino International Airport', iataCode: 'MNL', icaoCode: 'RPLL', city: 'Manila', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Mactan–Cebu International Airport', iataCode: 'CEB', icaoCode: 'RPVM', city: 'Cebu', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Francisco Bangoy International Airport', iataCode: 'DVO', icaoCode: 'RPMD', city: 'Davao', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Iloilo International Airport', iataCode: 'ILO', icaoCode: 'RPVI', city: 'Iloilo', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Clark International Airport', iataCode: 'CRK', icaoCode: 'RPLC', city: 'Clark', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Zamboanga International Airport', iataCode: 'ZAM', icaoCode: 'RPMZ', city: 'Zamboanga', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'General Santos International Airport', iataCode: 'GES', icaoCode: 'RPMR', city: 'General Santos', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Laoag International Airport', iataCode: 'LAO', icaoCode: 'RPLI', city: 'Laoag', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Subic Bay International Airport', iataCode: 'SFS', icaoCode: 'RPLB', city: 'Subic Bay', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Bicol International Airport', iataCode: 'DRP', icaoCode: 'RPLK', city: 'Legazpi', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Daniel Z. Romualdez Airport', iataCode: 'TAC', icaoCode: 'RPVA', city: 'Tacloban', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Bancasi Airport', iataCode: 'BXU', icaoCode: 'RPME', city: 'Butuan', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Dipolog Airport', iataCode: 'DPL', icaoCode: 'RPMG', city: 'Dipolog', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Sibulan Airport', iataCode: 'DGT', icaoCode: 'RPVD', city: 'Dumaguete', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Godofredo P. Ramos Airport', iataCode: 'MPH', icaoCode: 'RPVE', city: 'Caticlan (Boracay)', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Roxas Airport', iataCode: 'RXS', icaoCode: 'RPVR', city: 'Roxas', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Tuguegarao Airport', iataCode: 'TUG', icaoCode: 'RPUT', city: 'Tuguegarao', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Cauayan Airport', iataCode: 'CYZ', icaoCode: 'RPUY', city: 'Cauayan', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Basco Airport', iataCode: 'BSO', icaoCode: 'RPUO', city: 'Basco (Batanes)', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Naga Airport', iataCode: 'WNP', icaoCode: 'RPUN', city: 'Naga', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'San Jose Airport', iataCode: 'SJI', icaoCode: 'RPUH', city: 'San Jose (Mindoro)', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Moises R. Espinosa Airport', iataCode: 'MBT', icaoCode: 'RPVJ', city: 'Masbate', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Calbayog Airport', iataCode: 'CYP', icaoCode: 'RPVC', city: 'Calbayog', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Catarman National Airport', iataCode: 'CRM', icaoCode: 'RPVF', city: 'Catarman', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Labo Airport', iataCode: 'OZC', icaoCode: 'RPMO', city: 'Ozamiz', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Pagadian Airport', iataCode: 'PAG', icaoCode: 'RPMP', city: 'Pagadian', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Awang Airport', iataCode: 'CBO', icaoCode: 'RPMC', city: 'Cotabato', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Surigao Airport', iataCode: 'SUG', icaoCode: 'RPMS', city: 'Surigao', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Tandag Airport', iataCode: 'TDG', icaoCode: 'RPMW', city: 'Tandag', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Sayak Airport', iataCode: 'IAO', icaoCode: 'RPNS', city: 'Siargao', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Camiguin Airport', iataCode: 'CGM', icaoCode: 'RPMH', city: 'Camiguin', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Jolo Airport', iataCode: 'JOL', icaoCode: 'RPMJ', city: 'Jolo', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Sanga-Sanga Airport', iataCode: 'TWT', icaoCode: 'RPMN', city: 'Tawi-Tawi (Bongao)', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Virac Airport', iataCode: 'VRC', icaoCode: 'RPUV', city: 'Virac (Catanduanes)', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Marinduque Airport', iataCode: 'MRQ', icaoCode: 'RPUW', city: 'Marinduque', country: 'Philippines', timezone: 'Asia/Manila' },
  // No commercial service at the moment — kept for data completeness but hidden from live views
  { name: 'Loakan Airport', iataCode: 'BAG', icaoCode: 'RPUB', city: 'Baguio', country: 'Philippines', timezone: 'Asia/Manila', isActive: false },
  { name: 'Francisco B. Reyes Airport', iataCode: 'USU', icaoCode: 'RPVV', city: 'Coron (Busuanga)', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Evelio Javier Airport', iataCode: 'EUQ', icaoCode: 'RPVS', city: 'Antique (San Jose)', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'El Nido Airport', iataCode: 'ENI', icaoCode: 'RPEN', city: 'El Nido', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Puerto Princesa International Airport', iataCode: 'PPS', icaoCode: 'RPVP', city: 'Puerto Princesa', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Bohol–Panglao International Airport', iataCode: 'TAG', icaoCode: 'RPSP', city: 'Bohol', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Kalibo International Airport', iataCode: 'KLO', icaoCode: 'RPVK', city: 'Kalibo', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Bacolod–Silay Airport', iataCode: 'BCD', icaoCode: 'RPVB', city: 'Bacolod', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Laguindingan Airport', iataCode: 'CGY', icaoCode: 'RPMY', city: 'Cagayan de Oro', country: 'Philippines', timezone: 'Asia/Manila' },
  { name: 'Singapore Changi Airport', iataCode: 'SIN', icaoCode: 'WSSS', city: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore' },
  { name: 'Narita International Airport', iataCode: 'NRT', icaoCode: 'RJAA', city: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo' },
  { name: 'Hong Kong International Airport', iataCode: 'HKG', icaoCode: 'VHHH', city: 'Hong Kong', country: 'Hong Kong', timezone: 'Asia/Hong_Kong' },
  { name: 'Incheon International Airport', iataCode: 'ICN', icaoCode: 'RKSI', city: 'Seoul', country: 'South Korea', timezone: 'Asia/Seoul' },
  { name: 'Suvarnabhumi Airport', iataCode: 'BKK', icaoCode: 'VTBS', city: 'Bangkok', country: 'Thailand', timezone: 'Asia/Bangkok' },
  { name: 'Kuala Lumpur International Airport', iataCode: 'KUL', icaoCode: 'WMKK', city: 'Kuala Lumpur', country: 'Malaysia', timezone: 'Asia/Kuala_Lumpur' },
];

const AIRLINES = [
  { name: 'Philippine Airlines', iataCode: 'PR', icaoCode: 'PAL', country: 'Philippines' },
  { name: 'Cebu Pacific', iataCode: '5J', icaoCode: 'CEB', country: 'Philippines' },
];

// route as [origin, destination, durationMinutes, distanceKm]
const ROUTES: Array<[string, string, number, number]> = [
  ['MNL', 'CEB', 85, 570],
  ['CEB', 'MNL', 85, 570],
  ['MNL', 'DVO', 105, 970],
  ['DVO', 'MNL', 105, 970],
  ['MNL', 'ILO', 70, 460],
  ['ILO', 'MNL', 70, 460],
  ['MNL', 'PPS', 75, 590],
  ['PPS', 'MNL', 75, 590],
  ['MNL', 'TAG', 75, 630],
  ['TAG', 'MNL', 75, 630],
  ['MNL', 'KLO', 60, 345],
  ['KLO', 'MNL', 60, 345],
  ['MNL', 'BCD', 70, 480],
  ['BCD', 'MNL', 70, 480],
  ['MNL', 'CGY', 90, 800],
  ['CGY', 'MNL', 90, 800],
  // Clark hub
  ['CRK', 'CEB', 80, 500],
  ['CEB', 'CRK', 80, 500],
  ['CRK', 'DVO', 110, 990],
  ['DVO', 'CRK', 110, 990],
  ['CRK', 'SIN', 235, 2440],
  ['SIN', 'CRK', 235, 2440],
  // Inter-island
  ['CEB', 'DVO', 70, 400],
  ['DVO', 'CEB', 70, 400],
  // International
  ['MNL', 'SIN', 220, 2390],
  ['SIN', 'MNL', 220, 2390],
  ['MNL', 'NRT', 270, 3010],
  ['NRT', 'MNL', 270, 3010],
  ['MNL', 'HKG', 135, 1120],
  ['HKG', 'MNL', 135, 1120],
  ['MNL', 'ICN', 235, 2620],
  ['ICN', 'MNL', 235, 2620],
  ['MNL', 'BKK', 200, 2210],
  ['BKK', 'MNL', 200, 2210],
  ['MNL', 'KUL', 240, 2480],
  ['KUL', 'MNL', 240, 2480],
  ['CEB', 'SIN', 215, 2270],
  ['SIN', 'CEB', 215, 2270],
];

// --- Domestic hub-and-spoke network ------------------------------------
// Every regional Philippine airport connects to at least one hub. Route
// distance is derived from the coordinates below (great-circle) and block
// time approximated as 20 min taxi/climb + cruise at ~480 km/h.
const COORDS: Record<string, [number, number]> = {
  MNL: [14.508, 121.019],
  CEB: [10.307, 123.979],
  DVO: [7.125, 125.646],
  ILO: [10.833, 122.493],
  CRK: [15.186, 120.56],
  TAG: [9.574, 123.771],
  KLO: [11.679, 122.376],
  BCD: [10.776, 123.015],
  SIN: [1.364, 103.991],
  NRT: [35.772, 140.393],
  HKG: [22.308, 113.918],
  ICN: [37.469, 126.451],
  BKK: [13.69, 100.75],
  KUL: [2.746, 101.71],
  ZAM: [6.922, 122.06],
  GES: [6.058, 125.096],
  LAO: [18.178, 120.532],
  SFS: [14.794, 120.271],
  DRP: [13.07, 123.735],
  TAC: [11.228, 125.028],
  BXU: [8.951, 125.479],
  DPL: [8.602, 123.334],
  DGT: [9.334, 123.3],
  MPH: [11.924, 121.954],
  RXS: [11.598, 122.752],
  TUG: [17.643, 121.733],
  CYZ: [16.93, 121.753],
  BSO: [20.451, 121.98],
  WNP: [13.585, 123.27],
  SJI: [12.361, 121.047],
  MBT: [12.369, 123.629],
  CYP: [12.072, 124.545],
  CRM: [12.502, 124.636],
  OZC: [8.178, 123.842],
  PAG: [7.831, 123.461],
  CBO: [7.165, 124.21],
  SUG: [9.756, 125.481],
  TDG: [9.072, 126.171],
  IAO: [9.859, 126.014],
  CGM: [9.254, 124.707],
  JOL: [6.054, 121.011],
  TWT: [5.047, 119.743],
  VRC: [13.576, 124.206],
  MRQ: [13.361, 121.826],
  BAG: [16.375, 120.62],
  USU: [12.121, 120.1],
  EUQ: [10.766, 121.933],
  ENI: [11.202, 119.416],
  PPS: [9.742, 118.759],
  CGY: [8.612, 124.456],
};

const MNL_SPOKES = [
  'ZAM', 'GES', 'LAO', 'DRP', 'TAC', 'BXU', 'DPL', 'DGT', 'MPH', 'RXS',
  'TUG', 'CYZ', 'BSO', 'WNP', 'SJI', 'MBT', 'CYP', 'CRM', 'OZC', 'PAG',
  'CBO', 'SUG', 'TDG', 'IAO', 'CGM', 'JOL', 'VRC', 'MRQ', 'USU', 'EUQ', 'ENI',
];
const CEB_SPOKES = [
  'ZAM', 'GES', 'TAC', 'BXU', 'DPL', 'DGT', 'MPH', 'OZC', 'PAG', 'CBO',
  'SUG', 'TDG', 'IAO', 'CGM', 'SFS', 'BAG', 'PPS', 'CGY',
];
const ZAM_SPOKES = ['JOL', 'TWT'];

const toRad = (deg: number) => (deg * Math.PI) / 180;
const haversineKm = ([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]) => {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(a)));
};

// Appended AFTER the manual list: route array order determines flight
// numbers, so existing indices must never shift between seed runs.
const HUB_SPOKES: Array<[string, string[]]> = [
  ['MNL', MNL_SPOKES],
  ['CEB', CEB_SPOKES],
  ['ZAM', ZAM_SPOKES],
];
for (const [hub, spokes] of HUB_SPOKES) {
  for (const code of spokes) {
    const km = haversineKm(COORDS[hub], COORDS[code]);
    const duration = Math.round(20 + km / 8);
    ROUTES.push([hub, code, duration, km], [code, hub, duration, km]);
  }
}

async function seedSeats(seatLayoutId: string) {
  const columns = ['A', 'B', 'C', 'D', 'E', 'F'];
  const seatTypeFor = (col: string): SeatType =>
    col === 'A' || col === 'F' ? 'WINDOW' : col === 'C' || col === 'D' ? 'AISLE' : 'MIDDLE';

  // Every seat carries a selection fee — no free seats
  const extraPriceFor = (cabinClass: CabinClass, seatType: SeatType, isPremium: boolean) => {
    if (cabinClass === 'BUSINESS') return 500;
    if (isPremium) return 350;
    return seatType === 'WINDOW' ? 200 : seatType === 'AISLE' ? 150 : 100;
  };

  const seats = [];
  for (let row = 1; row <= 30; row++) {
    const cabinClass: CabinClass = row <= 4 ? 'BUSINESS' : 'ECONOMY';
    const isEmergencyExit = row === 13;
    const isPremium = row <= 4 || row === 5 || isEmergencyExit;
    for (const col of columns) {
      const seatType = seatTypeFor(col);
      seats.push({
        seatLayoutId,
        seatNumber: `${row}${col}`,
        row,
        column: col,
        cabinClass,
        seatType,
        isEmergencyExit,
        isPremium,
        extraPrice: extraPriceFor(cabinClass, seatType, isPremium),
      });
    }
  }
  await prisma.seat.createMany({ data: seats });
}

async function main() {
  console.log('Seeding roles...');
  for (const role of ROLES) {
    await prisma.role.upsert({ where: { name: role.name }, update: {}, create: role });
  }

  console.log('Seeding admin user...');
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMIN' } });
  const adminPassword = await bcrypt.hash('Admin@1234', 10);
  await prisma.user.upsert({
    where: { email: 'admin@planetickets.local' },
    // Re-running the seed restores the documented credentials/role
    update: { password: adminPassword, isEmailVerified: true, roleId: adminRole.id, userType: 'ADMIN' },
    create: {
      email: 'admin@planetickets.local',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Administrator',
      isEmailVerified: true,
      roleId: adminRole.id,
      userType: 'ADMIN',
    },
  });

  console.log('Seeding airports...');
  for (const airport of AIRPORTS) {
    const [latitude, longitude] = COORDS[airport.iataCode] ?? [undefined, undefined];
    const isActive = (airport as { isActive?: boolean }).isActive ?? true;
    await prisma.airport.upsert({
      where: { iataCode: airport.iataCode },
      // Re-running the seed backfills coordinates and the active flag
      update: { latitude, longitude, isActive },
      create: { ...airport, latitude, longitude, isActive },
    });
  }

  console.log('Seeding airlines...');
  for (const airline of AIRLINES) {
    await prisma.airline.upsert({ where: { iataCode: airline.iataCode }, update: {}, create: airline });
  }

  console.log('Seeding aircraft + seat layouts...');
  const pal = await prisma.airline.findUniqueOrThrow({ where: { iataCode: 'PR' } });
  const cebPac = await prisma.airline.findUniqueOrThrow({ where: { iataCode: '5J' } });

  const aircraftSpecs = [
    { airlineId: pal.id, model: 'Airbus A321neo', registration: 'RP-C9930' },
    { airlineId: pal.id, model: 'Airbus A350-900', registration: 'RP-C3507' },
    { airlineId: cebPac.id, model: 'Airbus A320neo', registration: 'RP-C4107' },
    { airlineId: cebPac.id, model: 'Airbus A330-900', registration: 'RP-C3900' },
  ];

  const aircrafts = [];
  for (const spec of aircraftSpecs) {
    let aircraft = await prisma.aircraft.findUnique({ where: { registration: spec.registration } });
    if (!aircraft) {
      aircraft = await prisma.aircraft.create({ data: { ...spec, totalSeats: 180 } });
      const layout = await prisma.seatLayout.create({
        data: {
          aircraftId: aircraft.id,
          name: `${spec.model} 2-class (30 rows, 3-3)`,
          cabinConfig: {
            business: { rows: [1, 4], columns: ['A', 'B', 'C', 'D', 'E', 'F'] },
            economy: { rows: [5, 30], columns: ['A', 'B', 'C', 'D', 'E', 'F'] },
            emergencyExitRows: [13],
          },
        },
      });
      await seedSeats(layout.id);
    }
    aircrafts.push(aircraft);
  }

  console.log('Seeding routes...');
  const airportByIata = new Map(
    (await prisma.airport.findMany()).map((a) => [a.iataCode, a])
  );
  const routes = [];
  for (const [origin, dest, duration, distance] of ROUTES) {
    const originAirport = airportByIata.get(origin)!;
    const destAirport = airportByIata.get(dest)!;
    const route = await prisma.flightRoute.upsert({
      where: {
        originAirportId_destinationAirportId: {
          originAirportId: originAirport.id,
          destinationAirportId: destAirport.id,
        },
      },
      update: {},
      create: {
        originAirportId: originAirport.id,
        destinationAirportId: destAirport.id,
        durationMinutes: duration,
        distanceKm: distance,
      },
    });
    routes.push(route);
  }

  console.log('Seeding flights (next 14 days)...');
  // Only generate for routes that have no flights yet, so re-running the seed
  // fills in newly added routes without duplicating existing schedules.
  const routesWithFlights = new Set(
    (await prisma.flight.findMany({ select: { routeId: true }, distinct: ['routeId'] })).map(
      (f) => f.routeId
    )
  );
  const airportById = new Map((await prisma.airport.findMany()).map((a) => [a.id, a]));
  const newRoutes = routes.filter((r) => !routesWithFlights.has(r.id));

  if (newRoutes.length > 0) {
    const departureHours = [6, 10, 14, 18];
    const flights = [];
    for (let day = 0; day < 14; day++) {
      for (let r = 0; r < routes.length; r++) {
        const route = routes[r];
        if (routesWithFlights.has(route.id)) continue;
        const airline = r % 2 === 0 ? pal : cebPac;
        const aircraft = aircrafts[r % aircrafts.length];
        const hour = departureHours[r % departureHours.length];

        const departureTime = new Date();
        departureTime.setDate(departureTime.getDate() + 1 + day);
        departureTime.setHours(hour, 0, 0, 0);
        const arrivalTime = new Date(departureTime.getTime() + route.durationMinutes * 60_000);

        const isInternational =
          airportById.get(route.originAirportId)!.country !==
          airportById.get(route.destinationAirportId)!.country;
        const base = isInternational ? 8500 : 2500;

        flights.push({
          // 20-wide blocks per route index: numbers from the original 10-wide
          // series (≤199) can't collide with routes added later (index ≥ 6 → ≥220)
          flightNumber: `${airline.iataCode}${100 + r * 20 + (day % 10)}`,
          airlineId: airline.id,
          aircraftId: aircraft.id,
          routeId: route.id,
          departureTime,
          arrivalTime,
          boardingTime: new Date(departureTime.getTime() - 45 * 60_000),
          terminal: isInternational ? '1' : '2',
          gate: `${String.fromCharCode(65 + (r % 4))}${(day % 9) + 1}`,
          economyPrice: base + (day % 5) * 150,
          businessPrice: base * 2.8 + (day % 5) * 300,
        });
      }
    }
    await prisma.flight.createMany({ data: flights });
    console.log(`Created ${flights.length} flights for ${newRoutes.length} new routes`);
  } else {
    console.log('Skipped — all routes already have flights');
  }

  console.log('Seeding meals & promo codes...');
  if ((await prisma.meal.count()) === 0) {
    await prisma.meal.createMany({
      data: [
        { name: 'Chicken Adobo Rice Meal', category: 'Standard', price: 350 },
        { name: 'Beef Tapa Rice Meal', category: 'Standard', price: 380 },
        { name: 'Vegetarian Pasta', category: 'Vegetarian', price: 320 },
        { name: 'Halal Chicken Biryani', category: 'Halal', price: 380 },
        { name: 'Kids Snack Pack', category: 'Kids', price: 250 },
      ],
    });
  }

  await prisma.promoCode.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      description: '10% off your first booking',
      discountType: 'PERCENT',
      discountValue: 10,
      maxUses: 1000,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('Seeding baggage options...');
  if ((await prisma.baggage.count()) === 0) {
    const baggage = [];
    for (const airline of [pal, cebPac]) {
      baggage.push(
        { airlineId: airline.id, type: 'CABIN' as const, weightKg: 7, price: 0 },
        { airlineId: airline.id, type: 'CHECKED' as const, weightKg: 20, price: 950 },
        { airlineId: airline.id, type: 'CHECKED' as const, weightKg: 32, price: 1650 }
      );
    }
    await prisma.baggage.createMany({ data: baggage });
  }

  console.log('✅ Seed complete');
  console.log('   Admin login: admin@planetickets.local / Admin@1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
