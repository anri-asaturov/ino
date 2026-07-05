import { App } from '@web/App';
import { ErrorFallback } from '@web/ErrorFallback.tsx';
import { createRoot } from 'react-dom/client';
import { withErrorBoundary, type FallbackProps } from 'react-error-boundary';

const ProtectedApp = withErrorBoundary(App, {
  fallbackRender: ({ error }: FallbackProps) => <ErrorFallback error={error as Error} />
});

createRoot(document.getElementById('root')!).render(<ProtectedApp />);
