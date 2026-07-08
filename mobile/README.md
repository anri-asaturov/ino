# Ino Mobile

Minimal Expo scaffold for the test task.

```bash
pnpm install
pnpm start
```

The dashboard calls the backend tRPC API. By default it uses `http://localhost:3007/trpc`.
Set `EXPO_PUBLIC_API_URL` when the backend is reachable somewhere else:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:3007 pnpm start
```
