import { initTRPC } from '@trpc/server';
import z, { ZodError } from 'zod';
import { setLogCtx } from '../helpers/logger.js';
import { type TRPCContext } from './context.js';
import { TRPCApiError } from './errors.js';

function summarizeInput(input: unknown) {
  if (Array.isArray(input)) {
    return { kind: 'array', items: input.length };
  }

  if (input && typeof input === 'object') {
    const values = Object.values(input);
    const firstArrayValue = values.find(Array.isArray);
    return {
      kind: 'object',
      keys: Object.keys(input).slice(0, 20),
      ...(firstArrayValue ? { items: firstArrayValue.length } : {})
    };
  }

  if (typeof input === 'string') {
    return { kind: 'string', bytes: Buffer.byteLength(input) };
  }

  return { kind: input === null ? 'null' : typeof input };
}

export const t = initTRPC.context<TRPCContext>().create({
  //this controls how client receives errors
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      message:
        error.cause instanceof ZodError ? JSON.parse(shape.message)[0]?.message : shape.message,
      data: {
        ...shape.data,
        zodError:
          error.code === 'BAD_REQUEST' && error.cause instanceof ZodError
            ? z.treeifyError(error.cause)
            : null,
        apiError: error instanceof TRPCApiError ? error.apiError : undefined
      }
    };
  }
});

export const loggerMiddleware = t.middleware(async (opts) => {
  let input: ReturnType<typeof summarizeInput> | undefined;
  try {
    input = summarizeInput(await opts.getRawInput());
  } catch {
    // mutations with no input send an empty body which fails JSON.parse
  }
  setLogCtx({
    trpc: {
      path: opts.path,
      type: opts.type,
      input
    }
  });

  return opts.next();
});

export const router = t.router;

/** Any user can call these */
export const publicProc = t.procedure //
  .use(loggerMiddleware);
