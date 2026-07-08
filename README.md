# ✈️ Plane Ticket Booking System

Scalable full-stack flight booking platform.

## Tech Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 19 + TypeScript + Vite, Tailwind CSS v4, React Router, TanStack Query, Zustand, Axios, React Hook Form + Zod |
| Backend  | Node.js + Express 5 + TypeScript, Prisma 6, Socket.IO, JWT (access + refresh cookie) |
| Database | PostgreSQL (NeonDB), Redis (seat locking — optional in dev) |
| Hosting  | Vercel (client) + Railway (API server) |

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
| `GET /api/flights?origin=MNL&destination=CEB&date=YYYY-MM-DD&sort=price` | Search flights (paginated; sort: `departure` / `price` / `duration`) |
| `GET /api/flights/:id` | Flight details |
| `GET /api/seats/flight/:flightId` | Seat map with live availability (AVAILABLE / LOCKED / BOOKED) |
| `POST /api/seats/lock` | Hold a seat for 5 min (auth required) |
| `POST /api/seats/release` | Release your held seat (auth required) |
| `POST /api/bookings` | Book held seats with passenger details (auth required) |
| `GET /api/bookings` | List my bookings (auth required) |
| `GET /api/bookings/:id` | Booking detail — owner or admin (auth required) |
| `POST /api/bookings/:id/cancel` | Cancel a booking, freeing its seats (auth required) |
| `POST /api/payments` | Pay a pending booking — demo gateway (auth required) |
| `POST /api/checkin/:bookingId` | Online check-in → tickets + boarding passes (auth required) |

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

## Deployment

**Client → Vercel**: import the GitHub repo; the root `vercel.json` builds
`client/` and adds SPA rewrites. Set env var `VITE_API_URL` to
`https://<railway-domain>/api`.

**Server → Railway**: create a service from this repo with **Root Directory =
`server`** (`server/railway.json` configures build, start, and the
`/api/health` healthcheck). Required env vars:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct (non-pooler) connection string |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | long random strings |
| `CLIENT_URL` | Vercel app URL (comma-separate multiple origins) |
| `NODE_ENV` | `production` |
| `REDIS_URL` | from a Railway Redis service: `${{Redis.REDIS_URL}}` |

## Booking flow

Seat selection → passenger details → payment → confirmed booking
(reference like `VF-8KD3QT`). Fares are computed server-side (cabin base
price + seat fee) and seats are re-validated against the caller's live
locks before the booking is created. The booking starts `PENDING` and
holds its seats for a **15-minute payment window**; paying (demo gateway:
card / GCash / Maya — card numbers ending in `0000` are declined)
confirms it, while unpaid bookings lapse to `EXPIRED` and their seats
free up automatically. Booked seats broadcast `seat:booked`; cancelling
frees seats and broadcasts `seat:released`.

**Round trips**: the flights page offers one-way / round-trip search; after
the outbound booking is paid, the app hands the prefilled return-leg search
back to the user (each leg is its own booking). **Online check-in** opens
24 hours before departure on confirmed bookings and issues `CHECKED_IN`
tickets plus boarding passes (seat, gate, boarding time, sequence).

## Roadmap (next modules)

- Booking extras (meals, baggage, promo codes)
- Real payment capture (Stripe/PayMongo) behind the demo gateway
- Ticket PDF + real QR generation, email delivery
- Admin dashboard, reports, audit logs
