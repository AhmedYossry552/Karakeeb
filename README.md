# Karakeeb (Monorepo)

This repo contains:
- **Backend**: `backend/` (.NET 8 Web API + EF Core)
- **Frontend**: `Karakeeb-Recycling-Website/` (Angular)

## Deploy on Railway (recommended)

### 1) Create Railway Project
1. Create a new Railway project from this GitHub repo.
2. Add **PostgreSQL** plugin (Railway will provide `DATABASE_URL`).

### 2) Backend service
Create a new Railway **Service** from repo:
- **Root directory**: `backend/`
- **Build**: Dockerfile (`backend/Dockerfile`)

Set environment variables:
- `Jwt__Secret` (required)
- `Jwt__Issuer` (default is `RecyclingApi`)
- `Jwt__Audience` (default is `RecyclingApiClient`)
- `EmailSettings__Password` (if email/OTP features are used)
- `Stripe__SecretKey` (if Stripe is used)
- `GROQ_API_KEY` (if used server-side)
- `Cors__AllowedOrigins__0` (set later to the deployed frontend URL)

Notes:
- DB schema is applied automatically at startup via `Database.Migrate()`.
- The app respects `X-Forwarded-Proto` so HTTPS redirection works behind Railway.

### 3) Frontend service
Create another Railway **Service** from repo:
- **Root directory**: `Karakeeb-Recycling-Website/`
- **Build**: Dockerfile (`Karakeeb-Recycling-Website/Dockerfile`)

Important:
- The frontend API base URL is compiled at build time from `src/environments/environment.prod.ts`.
- After you have the backend public URL, update `apiUrl` in `environment.prod.ts`, commit, and redeploy the frontend.
- Then set backend CORS: `Cors__AllowedOrigins__0=https://<your-frontend-domain>`.

## Move data from local SQL Server -> Railway Postgres

A small copy mode was added to the `backend/src/DataImport` tool.

### Prerequisites
- Local SQL Server is accessible (example connection string below).
- You have the Railway Postgres connection (recommended: use `DATABASE_URL` from Railway).

### Run the copy
From repo root:

```powershell
Push-Location .\backend\src\DataImport

# Example: copy local SQL Server (RecyclingDb) into Railway Postgres
# Provide Postgres via --target OR set DATABASE_URL environment variable.

dotnet run -c Release -- copy-sqlserver-to-postgres `
  --source "Server=localhost;Database=RecyclingDb;Trusted_Connection=True;TrustServerCertificate=True;" `
  --target "<paste postgres connection string here>" `
  --batchSize 500

Pop-Location
```

Safety:
- If the target DB already has data, the tool will stop. Use `--force` only if you know what you're doing.

After import:
- The tool attempts to reset sequences for integer-id tables.

