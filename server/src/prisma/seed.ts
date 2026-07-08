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
  { name: 'Singapore Changi Airport', iataCode: 'SIN', icaoCode: 'WSSS', city: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore' },
  { name: 'Narita International Airport', iataCode: 'NRT', icaoCode: 'RJAA', city: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo' },
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
  ['MNL', 'SIN', 220, 2390],
  ['SIN', 'MNL', 220, 2390],
  ['MNL', 'NRT', 270, 3010],
  ['NRT', 'MNL', 270, 3010],
];

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
    await prisma.airport.upsert({ where: { iataCode: airport.iataCode }, update: {}, create: airport });
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
  const existingFlights = await prisma.flight.count();
  if (existingFlights === 0) {
    const departureHours = [6, 10, 14, 18];
    const flights = [];
    for (let day = 0; day < 14; day++) {
      for (let r = 0; r < routes.length; r++) {
        const route = routes[r];
        const airline = r % 2 === 0 ? pal : cebPac;
        const aircraft = aircrafts[r % aircrafts.length];
        const hour = departureHours[r % departureHours.length];

        const departureTime = new Date();
        departureTime.setDate(departureTime.getDate() + 1 + day);
        departureTime.setHours(hour, 0, 0, 0);
        const arrivalTime = new Date(departureTime.getTime() + route.durationMinutes * 60_000);

        const isInternational = route.durationMinutes > 150;
        const base = isInternational ? 8500 : 2500;

        flights.push({
          flightNumber: `${airline.iataCode}${100 + r * 10 + (day % 10)}`,
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
    console.log(`Created ${flights.length} flights`);
  } else {
    console.log(`Skipped — ${existingFlights} flights already exist`);
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
