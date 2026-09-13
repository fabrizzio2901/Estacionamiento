# ParkIQ — parking management prototype

[Español](README.md)

A web application exploring parking spaces, sessions, pricing and driver balances. It combines a React frontend with an Express API and PostgreSQL.

**Status:** prototype for local evaluation. Payment screens simulate card entry; payment integration is incomplete and requires authorization and confirmation fixes.

## Implemented scope

- JWT registration/login and driver/admin views.
- Parking space and pricing management; session and report views.
- Occupancy updates through Socket.IO.
- Sensor state input over HTTP and optional MQTT.
- QR token generation and entry/exit routes.
- Payment, wallet and top-up models and routes.
- An assistant route using pricing and availability with a configurable external service.

The presence of routes and screens does not mean every integration is complete or verified with real hardware and providers.

## Stack

React 18, Vite 5, Tailwind CSS 3, Axios, React Router, Recharts, Node.js, Express, Prisma 5, PostgreSQL, Socket.IO and MQTT. The backend declares Stripe and OpenAI SDKs for optional integrations.

## Local setup

Requirements: Git, Node.js/npm and a development PostgreSQL instance. Prepare an **empty, dedicated** database such as `parkiq_demo` with an authorized local user. The repository does not pin a PostgreSQL version.

```bash
git clone https://github.com/fabrizzio2901/Estacionamiento.git
cd Estacionamiento/backend
npm ci
```

Create `backend/.env` with local values. The following values are fictional; replace the placeholders:

```dotenv
DATABASE_URL="postgresql://demo_user:REEMPLAZAR@localhost:5432/parkiq_demo?schema=public"
JWT_SECRET="REEMPLAZAR_POR_UN_SECRETO_LOCAL_ALEATORIO"
QR_SECRET="REEMPLAZAR_POR_OTRO_SECRETO_LOCAL_ALEATORIO"
PORT=4000
FRONTEND_URL="http://localhost:3000"
TARIFA_POR_HORA=20
```

Generate separate random values for the two secrets, for example by running this twice:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Do not commit `.env`. With the connection pointing to the empty demonstration database:

```bash
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

**The seed deletes existing payments and sessions.** Use it only in the demonstration database. It contains test accounts and prints their credentials when it finishes; those accounts are unsuitable for a public deployment.

The backend uses `http://localhost:4000`. In another terminal, from the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:3000`. Vite proxies `/api` and `/socket.io` to the backend.

## Example check

With the backend running:

```powershell
Invoke-RestMethod http://localhost:4000/api/health
```

Or with curl:

```bash
curl http://localhost:4000/api/health
```

The expected response includes `status: "ok"`. This route alone does not verify PostgreSQL connectivity. Then sign in with a seed test account and inspect the parking spaces.

## Optional integrations

| Integration | Backend variables |
|---|---|
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; top-ups also accept `STRIPE_WALLET_WEBHOOK_SECRET` |
| MQTT | `MQTT_BROKER_URL`; optional `MQTT_USERNAME`, `MQTT_PASSWORD`, `MQTT_TOPIC_PREFIX` |
| Assistant | `OPENAI_API_KEY`, `AI_MODEL` |
| JWT expiry | `JWT_EXPIRES_IN` |

Leave these unset when not evaluating those features. Use only test data with Stripe. The current interface does not confirm cards through Stripe Elements; do not enter real cards. The assistant uses an external service and may incur usage charges.

## Structure

- `frontend/src/pages/`: login, dashboard, payments and wallet.
- `frontend/src/components/`: admin panels, occupancy and QR.
- `backend/src/routes/`: API routes.
- `backend/src/services/`: sensor and MQTT handling.
- `backend/prisma/schema.prisma`: data models.
- `backend/prisma/seed.js`: demonstration data.

## Verification and limitations

The frontend was installed from its lockfile and built during the September 11, 2026 review. The build reported configuration and bundle-size warnings. The database, seed, complete backend, payments, hardware and assistant were not executed.

Before a public deployment, address:

- Administrator role assignment through public registration.
- Protection of sensor and entry/exit routes.
- Payment confirmations relying on incomplete conditions.
- Actual payment-provider integration in the frontend.
- Authorization, concurrency, balance and pricing tests.

There are no verified operational metrics or a verified public demonstration.

## My contribution

My role was full-stack development, contributing to the React frontend and the Express/PostgreSQL backend. The integration status and limitations above describe the published version.
