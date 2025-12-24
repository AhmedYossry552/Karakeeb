# Karakeeb Recycling System (Monorepo)

Karakeeb is a full-stack recycling platform built as a monorepo:

- Backend: .NET 8 Web API (EF Core)
- Frontend: Angular (standalone bootstrap)

## What This Project Does

Karakeeb helps manage a recycling workflow end-to-end: users can browse recyclable categories/items, create orders, track delivery/courier steps, and earn/spend points. The platform also includes administrative tools for managing users and orders, plus analytics.

### Core Features (high-level)

- Authentication & accounts
  - JWT-based auth and Google login support
  - User profiles and role-based access
- Catalog & ordering
  - Categories, cart, orders, addresses
  - Order status updates and history
- Delivery / courier operations
  - Courier/delivery workflows and assignment
- Payments & rewards
  - Payments integration (Stripe server-side)
  - Points system and wallet/transactions
- Engagement & support
  - Notifications
  - Reviews
  - Contact-us and subscriptions
- Admin & insights
  - Admin orders management
  - Analytics endpoints for dashboards
  - Sessions tracking
- Optional AI/voice helper
  - Transcription endpoint/service (used by the app when enabled)

### Roles & Typical Flows

- Customer
  - Browse categories/items → add to cart → place an order → track status → receive points
- Buyer
  - Buyer-oriented ordering and profile information (supported in the domain model)
- Delivery/Courier
  - View assigned orders → update delivery steps/status → complete deliveries
- Admin
  - Manage users/orders → review analytics → oversee platform operations

### Backend Modules (API surface)

The Web API exposes endpoints grouped by controllers (examples):

- Auth, Users, Profile
- Categories, Cart, Orders, Addresses
- Payments (Stripe), Wallet, Points
- Courier, Delivery
- Notifications, Reviews, Subscribe, ContactUs, Sessions
- AdminOrders, Analytics, Transcription

## Repo Structure

- backend/
  - Recycling.Backend.Net.sln
  - src/
    - Api/ (Web API)
    - Application/ (use-cases, services)
    - Domain/ (entities)
    - Infrastructure/ (EF Core, auth, persistence)
    - DataImport/ (data migration tools)
- Karakeeb-Recycling-Website/ (Angular app)

## Tech Stack

- Backend: .NET 8, ASP.NET Core Web API, Entity Framework Core
- Database: PostgreSQL (production/dev), SQL Server (supported as a migration source)
- Frontend: Angular 20, Angular Material, Tailwind

## Local Development

### Prerequisites

- .NET SDK 8.x
- Node.js 20+
- PostgreSQL (recommended) or a hosted Postgres instance

### 1) Backend (.NET API)

The API runs on:

- http://localhost:5289 (HTTP)
- https://localhost:7163 (HTTPS)

The backend requires a JWT secret. If it is missing, startup will fail.

From repo root:

```powershell
Push-Location .\backend\src\Api

# Required for startup
$env:Jwt__Secret = "dev-only-change-me"

# If you want to override DB from appsettings.Development.json
# $env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=karakeeb_dev;Username=postgres;Password=postgres;Ssl Mode=Disable"

dotnet run
Pop-Location
```

Swagger:

- Development: open https://localhost:7163/swagger (or http://localhost:5289/swagger)
- Non-development: Swagger can be enabled via `Swagger__Enabled=true`

### 2) Frontend (Angular)

The Angular dev server runs on http://localhost:4200.

The frontend API base URL is defined in `src/environments/environment.ts`:

- Default: `http://localhost:5289/api`

From repo root:

```powershell
Push-Location .\Karakeeb-Recycling-Website
npm install --legacy-peer-deps
npm start
Pop-Location
```

If you change backend port/URL, update `environment.ts` accordingly.

## Configuration

ASP.NET Core supports both JSON config and environment variables. Environment variables use `__` for nesting.

Common settings:

- `ConnectionStrings__DefaultConnection` (Postgres connection string)
- `Jwt__Secret` (required)
- `Jwt__Issuer` (default: RecyclingApi)
- `Jwt__Audience` (default: RecyclingApiClient)
- `Cors__AllowedOrigins__0` (example: http://localhost:4200)
- `EmailSettings__Password` (required only if email/OTP flows are used)
- `Stripe__SecretKey` (required only if Stripe is used server-side)
- `GROQ_API_KEY` (optional; keep secrets on backend)
- `Swagger__Enabled` (true/false)

Notes:

- The API applies EF Core migrations automatically at startup.
- Behind a reverse proxy (e.g., Railway), forwarded headers are enabled so HTTPS redirection does not loop.

## Docker (Local)

This repo includes separate Dockerfiles for backend and frontend.

### Backend container

Build:

```powershell
docker build -t karakeeb-api .\backend
```

Run (example):

```powershell
docker run --rm -p 8080:8080 `
  -e PORT=8080 `
  -e Jwt__Secret="dev-only-change-me" `
  -e ConnectionStrings__DefaultConnection="Host=host.docker.internal;Port=5432;Database=karakeeb_dev;Username=postgres;Password=postgres;Ssl Mode=Disable" `
  karakeeb-api
```

### Frontend container

Build:

```powershell
docker build -t karakeeb-web .\Karakeeb-Recycling-Website
```

Run:

```powershell
docker run --rm -p 8081:8080 -e PORT=8080 karakeeb-web
```

## Deploy on Railway (Recommended)

### 1) Create Railway project

1. Create a new Railway project from this GitHub repo.
2. Add a PostgreSQL plugin (Railway provides `DATABASE_URL`).

### 2) Backend service

Create a Railway service from the repo:

- Root directory: `backend/`
- Build: Dockerfile (`backend/Dockerfile`)

Set environment variables:

- `DATABASE_URL` (provided by Railway Postgres)
- `Jwt__Secret` (required)
- `Cors__AllowedOrigins__0` (set this to your frontend domain after deploying it)

Optional (feature-dependent):

- `EmailSettings__Password`
- `Stripe__SecretKey`
- `GROQ_API_KEY`

### 3) Frontend service

Create another Railway service:

- Root directory: `Karakeeb-Recycling-Website/`
- Build: Dockerfile (`Karakeeb-Recycling-Website/Dockerfile`)

Important:

- The production API URL is compiled at build time from `src/environments/environment.prod.ts`.
- After the API is deployed, update `apiUrl` in `environment.prod.ts`, commit, and redeploy the frontend.
- Then allow the frontend domain in backend CORS via `Cors__AllowedOrigins__0=https://<your-frontend-domain>`.

## Data Migration / Import

The `backend/src/DataImport` tool includes a SQL Server -> Postgres copy mode.

### Copy SQL Server to Postgres

From repo root:

```powershell
Push-Location .\backend\src\DataImport

dotnet run -c Release -- copy-sqlserver-to-postgres `
  --source "Server=localhost;Database=RecyclingDb;Trusted_Connection=True;TrustServerCertificate=True;" `
  --target "<paste your PUBLIC Postgres connection string here>" `
  --batchSize 500

Pop-Location
```

Safety:

- If the target DB already has data, the tool stops. Use `--force` only if you are sure.
- Railway internal DB hosts ending with `.railway.internal` cannot be reached from your local machine.

## Troubleshooting

- Startup error: "JWT secret is not configured"
  - Set `Jwt__Secret` (or `Jwt:Secret`) before running.
- CORS errors in browser
  - Ensure `Cors__AllowedOrigins__0` includes `http://localhost:4200` (local) or your deployed frontend URL.
- Postgres timestamp errors (Npgsql)
  - The app enables legacy timestamp behavior by default to support historical data.

