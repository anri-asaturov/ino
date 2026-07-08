# Ino

A small full-stack app that imports time-series lab results for mock patients and displays them in a table.

**Live demo:** https://ino-web.onrender.com

On startup the backend prefills PostgreSQL with lab results for 10 patients from the mock API. **add new data** imports a selectable number of additional patients, **reset** empties the database and re-imports the initial dataset. The table offers two views — a flat time series and results grouped by patient — both with cursor-based (keyset) pagination and virtualized infinite scrolling. Values outside general adult reference ranges are marked with a low/high indicator.

## Stack

pnpm workspaces monorepo:

- `apps/backend` — Fastify + tRPC v11, Prisma 7, PostgreSQL
- `apps/web` — React 19, Vite, TanStack Query + Virtual, Tailwind CSS
- Zod 4 validates env vars, tRPC inputs, and the mock API responses; types flow end-to-end from the Prisma schema to the frontend without codegen

## Development

1. Install Node.js 24 (see `engines` in [package.json](package.json))
2. In the project directory run `corepack enable`
3. Install dependencies `pnpm install`
4. Copy env files:
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   cp apps/web/.env.example apps/web/.env
   ```
5. Start PostgreSQL from the repo Compose file `docker compose up -d`
6. Apply database migrations `pnpm prisma migrate deploy`
7. Start the development server `pnpm dev` (API on :3007, web on :3008)

### Local PostgreSQL

You can use any local or remote PostgreSQL instance. The default backend connection string is:

```env
DATABASE_URL="postgresql://postgres@localhost:5432/ino?schema=public"
```

The repo includes `compose.yaml` for local PostgreSQL:

```bash
docker compose up -d
```

## Tests

```bash
pnpm test                    # Prisma client generation, typechecks, backend unit tests
pnpm test:build-all          # production build of backend and web
pnpm back test:integration   # pagination against real PostgreSQL (needs `docker compose up -d`);
                             # creates a disposable database, migrates it, and drops it afterwards
```

## Configuration

`LAB_RESULTS_INITIAL_PATIENTS` (optional, default `10`) — how many patients the backend prefills on startup and after a reset; also the default batch size for the `addNewData` endpoint when no count is passed. The UI passes an explicit count from its selector.

## Environments, environment variables and secrets

We use 3 environments:

- local
- development
- production

`INO_ENV` controls the backend environment. `VITE_INO_ENV` controls the web environment.

## Deployment

Deployed to [Render](https://render.com) from the [render.yaml](render.yaml) blueprint: a static site for the web app, a Node service for the API, and managed PostgreSQL. The static site rewrites `/api/*` to the API service, so the frontend calls same-origin URLs. Migrations run in the API pre-deploy step.

## Open questions/decisions/assumptions

- The task description mentions mock api can return no results, while requires to prefill data on start. Theoretically we could call import several times and get 0 results on all calls.

- Patient + date conflicts are handled by overwriting the existing lab result row with the latest imported values.

- Startup prefill runs after the API starts listening, so a slow or unavailable mock API cannot block startup or health checks. Reset re-runs the same initialization after emptying the database.

- Reset and `addNewData` are not serialized. This can race, but it's acceptable for this test assignment.

- Dates are stored as `VARCHAR(10)` ISO strings (`YYYY-MM-DD`) to avoid timezone conversion issues.

- Startup prefill is best-effort: first reads on an empty database can briefly return empty data until the background import completes.
