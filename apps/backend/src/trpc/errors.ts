import { TRPCError } from '@trpc/server';

export enum API_ERRORS {}

export type API_ERROR_KEYS = keyof typeof API_ERRORS;

export class TRPCApiError extends TRPCError {
  constructor(opts: { message?: string; apiError: API_ERROR_KEYS }) {
    super({
      message: opts.message,
      code: 'BAD_REQUEST',
      cause: opts.apiError
    });
  }

  public get apiError() {
    return this.cause?.message as API_ERROR_KEYS;
  }
}
