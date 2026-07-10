---
name: verify
description: Build, launch, and drive the Plane Ticket Reservation app to verify client/server changes end-to-end.
---

# Verifying this app

## Launch

```bash
cd server && npm run dev   # http://localhost:5000 (needs server/.env — already present; NeonDB)
cd client && npm run dev   # http://localhost:5173 (proxies /api + /socket.io to :5000)
# ready when GET http://localhost:5000/api/health returns 200 and :5173 serves
```

## Drive (headless browser)

No Playwright installed. Use headless Edge + raw CDP over websocket; `ws` is available at
`client/node_modules/ws`. Edge lives at `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`;
launch with `--headless=new --remote-debugging-port=<port> --user-data-dir=<scratch>` and connect to
`ws` URL from `http://127.0.0.1:<port>/json`. Kill only the spawned PID tree afterwards
(`taskkill /F /PID <pid> /T`) — never `taskkill /IM msedge.exe`, the user runs Edge.

- React-controlled inputs: set via native value setter + `dispatchEvent(new Event('input', {bubbles:true}))`;
  CDP `Input.insertText` is unreliable here.
- Login (`/login`) pops a SuccessModal after submit — click the button matching /dashboard|continue/i
  to reach `/dashboard`.
- `/flights` allows guests; `/dashboard`, bookings, check-in require a CUSTOMER login; `/admin` requires ADMIN.
- Register a throwaway customer via `POST /api/auth/register` `{email,password,firstName,lastName}`.
- Seeded admin: `admin@planetickets.local` / `Admin@1234` (redirects to /admin, not /dashboard).

## Test data

The DB is a shared NeonDB dev database — create test rows with distinctive markers and delete them after.
Prisma client is usable from `server/` in a plain `.mjs` script (`import 'dotenv/config'` then
`new PrismaClient()`). Useful pattern: temp flight with `flightNumber: 'VF999'` cloned from an existing
flight on a real route (needs airlineId/aircraftId/routeId from a template row), plus a CONFIRMED booking
(`bookingReference` unique, booking_passengers cascade on booking delete; delete Passenger rows separately).

## Gotchas

- Use a **unique Edge profile dir per run** (`edge-profile-${pid}`): killing the spawned PID tree
  misses detached children, which keep the old profile locked ("Device or resource busy" on rm).
- TaskStop on `npm run dev` leaves orphaned tsx/vite node children holding ports 5000/5173 and the
  Prisma DLL. Sweep with: `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where CommandLine
  -like '*Plane-Ticket-Reservation*' | Stop-Process` before prisma generate or restarting servers.

- PowerShell 5.1 quirks — prefer the Bash tool for node/curl one-liners.
- Vite dev server takes ~10s; server ~15s (Prisma + NeonDB connect).
- Local timezone is UTC+8; seeded flights span 14 days from seed time — at night nothing may be "in air".
