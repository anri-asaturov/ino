import { QueryClientProvider } from '@tanstack/react-query';
import { App } from '@web/App';
import { ErrorFallback } from '@web/ErrorFallback.tsx';
import { queryClient } from '@web/lib/trpc';
import { createRoot } from 'react-dom/client';
import { withErrorBoundary, type FallbackProps } from 'react-error-boundary';

const AppWithErrorBoundary = withErrorBoundary(App, {
  fallbackRender: ({ error }: FallbackProps) => <ErrorFallback error={error as Error} />
});

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <AppWithErrorBoundary />
  </QueryClientProvider>
);
