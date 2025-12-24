# Karakeeb Recycling Website (Angular)

This folder contains the Angular frontend for the Karakeeb Recycling System.

## Prerequisites

- Node.js 20+
- npm

## Run Locally

```powershell
npm install --legacy-peer-deps
npm start
```

Open: http://localhost:4200

## API Base URL

The API base URL is configured via Angular environments:

- Development: `src/environments/environment.ts`
- Production build: `src/environments/environment.prod.ts`

Example (development):

- `apiUrl: 'http://localhost:5289/api'`

Important:

- The production `apiUrl` is compiled into the build output. If you change the backend URL, update `environment.prod.ts` and rebuild/redeploy.

## Build

```powershell
npm run build
```

## Docker

This frontend has a Dockerfile that builds the Angular app and serves it using `serve` on the `PORT` environment variable.

```powershell
docker build -t karakeeb-web .
docker run --rm -p 8081:8080 -e PORT=8080 karakeeb-web
```