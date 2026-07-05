import { requestContext } from '@fastify/request-context';
import { type FastifyLoggerOptions } from 'fastify';
import { pino, type BaseLogger, type DestinationStream } from 'pino';
import pinoPretty from 'pino-pretty';

export type RequestLogContext = {
  trpc?: {
    path?: string;
    type: string;
    input?: {
      kind: string;
      bytes?: number;
      items?: number;
      keys?: string[];
    };
  };
  error?: Error;
  userId?: string;
};

declare module '@fastify/request-context' {
  interface RequestContextData {
    log: BaseLogger;
    logCtx: RequestLogContext;
  }
}

export function getLogCtx(): RequestLogContext {
  return requestContext.get('logCtx') ?? {};
}

export function setLogCtx(data: Partial<RequestLogContext>) {
  Object.assign(getLogCtx(), data);
}

const isDevNodeEnv = process.env.NODE_ENV === 'development';
const isTestNodeEnv = process.env.NODE_ENV === 'test';
const isProdNodeEnv = process.env.NODE_ENV === 'production';

const pinoLogLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'] as const;
type PinoLogLevel = (typeof pinoLogLevels)[number];

function getConfiguredLogLevel(): PinoLogLevel | undefined {
  const value = process.env.LOG_LEVEL;
  return pinoLogLevels.includes(value as PinoLogLevel) ? (value as PinoLogLevel) : undefined;
}

export const serverLogLevel =
  getConfiguredLogLevel() ?? (isProdNodeEnv ? 'info' : isTestNodeEnv ? 'error' : 'trace');

function redactRequestUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;

  const queryStart = value.indexOf('?');
  return queryStart === -1 ? value : value.slice(0, queryStart);
}

const serializers: FastifyLoggerOptions['serializers'] = {
  req: (req) => {
    return {
      method: req.method,
      url: redactRequestUrl(req.url),
      ip: req.ip
    };
  },
  res: (res) => {
    return {
      duration: Math.round(res.elapsedTime ?? 0),
      status: res.statusCode
    };
  }
};

// Use pino-pretty as an in-process destination stream so stdout works with concurrently.
const devPrettyStream: DestinationStream | undefined = isDevNodeEnv
  ? pinoPretty({ colorize: true, translateTime: true, ignore: 'pid,hostname' })
  : undefined;

export const baseLog = pino(
  {
    level: serverLogLevel,
    ...(isProdNodeEnv
      ? {
          formatters: {
            level: (label) => ({ level: label })
          },
          serializers,
          base: {
            ddsource: 'server',
            commit: process.env.RENDER_GIT_COMMIT
            //instance: process.env.RENDER_INSTANCE_ID // not useful yet, but when we have multiple instances, it will be
          }
        }
      : {}),
    ...(isDevNodeEnv ? { serializers } : {}),
    nestedKey: 'payload'
  },
  devPrettyStream
);

// Proxy that uses context-scoped logger when available, falls back to base logger
export const log = new Proxy(baseLog, {
  get(target, prop, receiver) {
    const logger = requestContext.get('log') ?? target;
    const value = Reflect.get(logger, prop, receiver);
    return typeof value === 'function' ? value.bind(logger) : value;
  }
});

export function getChildLogger(name: string) {
  return baseLog.child({ name });
}

const loggerUncaughtExceptionListenerKey = Symbol.for(
  'ino.logger.uncaughtExceptionListenerRegistered'
);
const loggerGlobal = globalThis as typeof globalThis & {
  [loggerUncaughtExceptionListenerKey]?: boolean;
};

if (!loggerGlobal[loggerUncaughtExceptionListenerKey]) {
  process.on('uncaughtException', function (err) {
    log.error(err);
  });
  loggerGlobal[loggerUncaughtExceptionListenerKey] = true;
}
