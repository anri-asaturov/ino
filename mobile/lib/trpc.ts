import type { ApiRouter } from '../../apps/backend/api-types';
import { QueryClient } from '@tanstack/react-query';
import { createTRPCClient, httpLink, loggerLink } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';

const DEFAULT_API_URL = 'http://localhost:3007/trpc';
const MOBILE_QUERY_RETRY_LIMIT = 3;

function shouldRetryQueryError(error: unknown) {
  return !(error instanceof Error && error.message.includes('UNAUTHORIZED'));
}

function getTrpcUrl() {
  const rawUrl = process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_URL;
  const url = rawUrl.replace(/\/+$/, '');

  return url.endsWith('/trpc') ? url : `${url}/trpc`;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        failureCount < MOBILE_QUERY_RETRY_LIMIT && shouldRetryQueryError(error)
    }
  }
});

export const trpcDirect = createTRPCClient<ApiRouter>({
  links: [
    loggerLink({
      withContext: false,
      colorMode: 'none',
      enabled: (opts) => opts.direction === 'down' && opts.result instanceof Error
    }),
    httpLink({ url: getTrpcUrl() })
  ]
});

export const trpc = createTRPCOptionsProxy<ApiRouter>({
  client: trpcDirect,
  queryClient
});
