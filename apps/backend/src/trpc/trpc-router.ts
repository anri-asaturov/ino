import { router } from './trpc-server.js';

export const trpcRouter = router({});

export type ApiRouter = typeof trpcRouter;
