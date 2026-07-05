import type { ApiRouter } from '@ino/backend';
import { QueryClient } from '@tanstack/react-query';
import { createTRPCClient, httpLink, loggerLink } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { inoEnv } from '@web/lib/config';

const WEB_QUERY_RETRY_LIMIT = 3;

function shouldRetryQueryError(error: unknown) {
  return !(error instanceof Error && error.message.includes('UNAUTHORIZED'));
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) =>
        failureCount < WEB_QUERY_RETRY_LIMIT && shouldRetryQueryError(error)
    }
  }
});

export const trpcDirect = createTRPCClient<ApiRouter>({
  links: [
    loggerLink({
      withContext: false,
      colorMode: inoEnv === 'production' ? 'none' : 'css',
      enabled: (opts) =>
        inoEnv !== 'production' || (opts.direction === 'down' && opts.result instanceof Error)
    }),
    httpLink({ url: '/api/trpc' })
  ]
});

export const trpc = createTRPCOptionsProxy<ApiRouter>({
  client: trpcDirect,
  queryClient
});
