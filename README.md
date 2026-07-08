# ✈️ Plane Ticket Booking System

Scalable full-stack flight booking platform.

## Tech Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 19 + TypeScript + Vite, Tailwind CSS v4, React Router, TanStack Query, Zustand, Axios, React Hook Form + Zod |
| Backend  | Node.js + Express 5 + TypeScript, Prisma 6, Socket.IO, JWT (access + refresh cookie) |
| Database | PostgreSQL (NeonDB), Redis (seat locking — optional in dev) |
| Hosting  | Vercel (client) |

## Getting started

### 1. Server

```bash
cd server
npm install
cp .env.example .env   # fill in DATABASE_URL / DIRECT_URL / JWT secrets
npx prisma db push     # sync schema to NeonDB
npm run seed           # roles, admin, airlines, airports, aircraft, 14 days of flights
npm run dev            # http://localhost:5000
```

Seeded admin: `admin@planetickets.local` / `Admin@1234`

### 2. Client

```bash
cd client
npm install
npm run dev            # http://localhost:5173 (proxies /api + /socket.io to :5000)
```

## API (implemented so far)

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `POST /api/auth/register` | Create account (CUSTOMER role) |
| `POST /api/auth/login` | Login → access token + refresh cookie |
| `POST /api/auth/refresh` | Rotate tokens via refresh cookie |
| `POST /api/auth/logout` | Clear refresh cookie |
| `GET /api/auth/me` | Current user (Bearer token) |
| `GET /api/flights?origin=MNL&destination=CEB&date=YYYY-MM-DD` | Search flights (paginated) |
| `GET /api/flights/:id` | Flight details |
| `GET /api/seats/flight/:flightId` | Seat map with live availability (AVAILABLE / LOCKED / BOOKED) |
| `POST /api/seats/lock` | Hold a seat for 5 min (auth required) |
| `POST /api/seats/release` | Release your held seat (auth required) |

## Backend pattern

```
Routes → Controllers → Services → Repositories → Prisma → PostgreSQL
```

The Prisma schema (`server/src/prisma/schema.prisma`) covers all 22 tables:
users, roles, permissions, passengers, airlines, airports, aircrafts,
seat_layouts, seats, flights, flight_routes, bookings, booking_passengers,
tickets, boarding_passes, payments, refunds, notifications, audit_logs,
promo_codes, baggage, meals.

## Seat locking

Seats are held for **5 minutes** when selected. Locks live in Redis when
`REDIS_URL` is set; otherwise an in-memory store is used (dev only — set
`REDIS_URL` in production). Lock/release events broadcast over Socket.IO
(`seat:locked`, `seat:released`) to everyone viewing that flight's seat map.

## Roadmap (next modules)

- Booking flow (passengers, meals, baggage, promo codes)
- Payments (Stripe/PayMongo)
- Ticket PDF + QR generation, email delivery
- Check-in & boarding passes
- Admin dashboard, reports, audit logs
