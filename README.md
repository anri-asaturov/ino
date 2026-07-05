# Ino

## Development

1. Install nodejs
2. In the project directory run `corepack enable`
3. Install dependencies `pnpm install`
4. Make sure PostgreSQL is running and available via `apps/backend/.env`
5. Start the development server `pnpm dev`

### Local PostgreSQL

You can use any local or remote PostgreSQL instance. The default backend connection string is:

```env
DATABASE_URL="postgresql://postgres@localhost:5432/ino?schema=public"
```

If you want to run PostgreSQL with Docker, start the included Compose service:

```bash
docker compose up -d
```

## Environments, environment variables and secrets

We use 3 environments:

- local
- development
- production

`INO_ENV` controls the backend environment. `VITE_INO_ENV` controls the web environment.
