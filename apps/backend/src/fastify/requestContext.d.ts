import '@fastify/request-context';
import type { BaseLogger } from 'pino';
import type { RequestLogContext } from '../helpers/logger.js';

declare module '@fastify/request-context' {
  interface RequestContextData {
    log: BaseLogger;
    logCtx: RequestLogContext;
  }
}
