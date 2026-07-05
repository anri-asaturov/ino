import { PrismaPg } from '@prisma/adapter-pg';
import type { ITXClientDenyList } from '@prisma/client/runtime/client';
import { PrismaClient } from '../generated/prisma/client.js';
import { isDeployedServer, isLocalDevServer } from './config.js';
import { log } from './helpers/logger.js';

export type PrismaClientIno = PrismaClient<'query' | 'info' | 'warn' | 'error'>;

export type PrismaTransactionClient = Omit<PrismaClientIno, ITXClientDenyList>;

function createPrismaClient(): PrismaClientIno {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    idleTimeoutMillis: 60_000
  });

  const client = new PrismaClient({
    adapter,
    log: [
      { level: 'query', emit: 'event' },
      { level: 'info', emit: 'event' },
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' }
    ],
    errorFormat: 'minimal'
  });

  return client;
}

export const db = ((global as any).prisma as PrismaClientIno) || createPrismaClient();

if (isDeployedServer) {
  // db.$on('query', (e) => {
  //   statTiming(Metrics.PrismaQueryDuration, e.duration);
  // });
} else if (!process.env._IN_SEED_SCRIPT && !process.env.SQL_LOG_DISABLED) {
  db.$on('query', (e) => {
    try {
      let query = e.query.replaceAll('"public".', '').replaceAll('"', '');

      // Substitute parameters into query
      const params = JSON.parse(e.params);
      if (Array.isArray(params) && params.length > 0) {
        // Replace in reverse order to handle $10 before $1, etc.
        for (let i = params.length - 1; i >= 0; i--) {
          const value = params[i];
          let formattedValue: string;

          if (value === null) {
            formattedValue = 'NULL';
          } else if (typeof value === 'string') {
            formattedValue = `'${value.replaceAll("'", "''")}'`;
          } else if (value instanceof Date) {
            formattedValue = `'${value.toISOString()}'`;
          } else if (typeof value === 'object') {
            formattedValue = `'${JSON.stringify(value).replaceAll("'", "''")}'`;
          } else {
            formattedValue = String(value);
          }

          query = query.replaceAll(`$${i + 1}`, formattedValue);
        }
      }

      log.debug(query);
      if (e.duration > 5) log.warn('SQL Duration: ' + e.duration.toFixed(2) + 'ms');
    } catch (error) {
      log.debug({ query: e.query.replaceAll('\\"', '"'), params: e.params.replaceAll('\\"', '"') });
    }
  });
}

db.$on('info', (e) => {
  log.info(e.message);
});

db.$on('warn', (e) => {
  log.warn(e.message);
});

db.$on('error', (e) => {
  log.error({
    prismaError: e
  });
});

// a trick to make sure we only instantiate Prisma once in development
// otherwise hot reloading would create new clients
if (isLocalDevServer && !process.env._IN_SEED_SCRIPT) (global as any).prisma = db;
