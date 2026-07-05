import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRequestContext from '@fastify/request-context';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import fastify, { type FastifyBaseLogger } from 'fastify';
import gracefulShutdown from 'fastify-graceful-shutdown';
import type { BaseLogger } from 'pino';
import env, { CORS_ORIGINS } from './config.js';
import { getLogCtx, log, serverLogLevel, setLogCtx } from './helpers/logger.js';
import { createContext } from './trpc/context.js';
import { type ApiRouter, trpcRouter } from './trpc/trpc-router.js';

const requestLogSlowMs = env.REQUEST_LOG_SLOW_MS ?? 1500;

type RequestLogDecision =
  | { shouldLog: false }
  | {
      shouldLog: true;
      level: 'error' | 'warn' | 'info';
      reason: 'error' | 'client_error' | 'slow' | 'development';
    };

function getRequestLogDecision(
  statusCode: number,
  durationMs: number,
  hasError: boolean
): RequestLogDecision {
  if (hasError || statusCode >= 500) {
    return { shouldLog: true, level: 'error', reason: 'error' };
  }
  if (statusCode >= 400) {
    return { shouldLog: true, level: 'warn', reason: 'client_error' };
  }
  if (durationMs >= requestLogSlowMs) {
    return { shouldLog: true, level: 'info', reason: 'slow' };
  }
  if (env.NODE_ENV !== 'production') {
    return { shouldLog: true, level: 'info', reason: 'development' };
  }
  return { shouldLog: false };
}

export async function createServer() {
  const port = env.PORT || 3007;
  const bodyLimitBytes = 1024 * 1024 * 2;

  const server = fastify({
    loggerInstance: log as FastifyBaseLogger,
    trustProxy: true,
    routerOptions: {
      ignoreDuplicateSlashes: true,
      ignoreTrailingSlash: true
    },
    bodyLimit: bodyLimitBytes,
    disableRequestLogging: true
  });

  server.register(fastifyCors, {
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Requested-With', 'Origin'],
    credentials: true,
    maxAge: 86400
  });

  await server.register(fastifyHelmet, {
    contentSecurityPolicy: false // API serves JSON, CSP not strictly needed and can cause issues with some clients if not careful
  });

  // /healthz - health check endpoint
  const disableLogsOnRoutes = ['/healthz'];

  function isLogDisabled(url: string) {
    return disableLogsOnRoutes.some((route) => url.startsWith(route));
  }

  server.addHook('onResponse', (req, res, done) => {
    if (isLogDisabled(req.url)) {
      return done();
    }
    const logCtx = getLogCtx();
    const durationMs = Math.round(res.elapsedTime ?? 0);
    const decision = getRequestLogDecision(res.statusCode, durationMs, Boolean(logCtx.error));
    if (!decision.shouldLog) {
      return done();
    }

    const logData = {
      req,
      res,
      requestLogReason: decision.reason,
      ...(logCtx.trpc ? { trpc: logCtx.trpc } : {}),
      ...(logCtx.userId ? { userId: logCtx.userId } : {})
    };
    if (decision.level === 'error') {
      req.log.error({ ...logData, err: logCtx.error }, logCtx.trpc?.path ?? 'request error');
    } else if (decision.level === 'warn') {
      req.log.warn(logData, logCtx.trpc?.path ?? 'request warning');
    } else {
      req.log.info(logData, logCtx.trpc?.path);
    }
    return done();
  });

  server.register(fastifyRequestContext, {
    defaultStoreValues: (request) => ({
      log: request.log.child({ reqId: request.id }) as unknown as BaseLogger,
      logCtx: {}
    })
  });

  // plugins
  await server.register(gracefulShutdown);

  // REST routes
  server.get('/', () => '');
  server.get('/healthz', { logLevel: 'silent' }, () => {
    return { status: 'ok' };
  });

  // tRPC routes
  await server.register(fastifyTRPCPlugin<ApiRouter>, {
    prefix: '/trpc',
    useWSS: false,
    trpcOptions: {
      router: trpcRouter,
      createContext,
      allowBatching: false,
      onError: (opts) => {
        setLogCtx({ error: opts.error });
      }
    },
    logLevel: serverLogLevel
  });

  const stop = async () => {
    await server.close();
  };

  const start = async () => {
    try {
      await server.listen({ host: '0.0.0.0', port });
    } catch (err) {
      server.log.error(err);
      process.exit(1);
    }
  };

  server.after(() => {
    server.gracefulShutdown(async (signal) => {
      log.info('Graceful shutdown initiated. Signal: ' + signal);
      log.flush();
    });
  });

  return { server, start, stop };
}
