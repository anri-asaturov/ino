import { useState } from 'react';

export function ErrorFallback({ error }: { error: Error }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="from-background via-background to-muted/20 flex min-h-screen items-center justify-center bg-linear-to-br p-4">
      <div className="w-full max-w-2xl space-y-8 text-center">
        {/* Icon */}
        <div className="bg-destructive/10 text-destructive mx-auto flex size-16 items-center justify-center rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        {/* Main message */}
        <div className="space-y-3">
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Oops! Something unexpected happened
          </h1>
          <p className="text-muted-foreground mx-auto max-w-md text-lg">
            We're sorry for the inconvenience. Don't worry — your data is safe. Please try one of
            the following solutions:
          </p>
        </div>

        {/* Action buttons - Primary actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50 focus-visible:border-ring inline-flex h-10 items-center justify-center gap-2 rounded-lg px-6 py-2 text-sm font-medium whitespace-nowrap shadow-xs transition-all outline-none focus-visible:ring-[3px]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            Reload Page
          </button>
        </div>

        {/* Secondary actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={() => (window.location.href = '/')}
            className="hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring/50 focus-visible:border-ring inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
              />
            </svg>
            Go to Home Page
          </button>
          <a
            href="/"
            className="hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring/50 focus-visible:border-ring inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
            Back to Home
          </a>
        </div>

        {/* Error details */}
        <div className="mx-auto max-w-lg pt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-foreground hover:text-muted-foreground text-sm transition-colors"
          >
            {showDetails ? 'Hide' : 'Show'} technical details
          </button>
          {showDetails && (
            <div className="bg-muted/50 mt-4 rounded-lg border p-4 text-left">
              <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                Error Message
              </p>
              <pre className="text-foreground overflow-x-auto font-mono text-sm">
                {error.message}
              </pre>
              {error.stack && (
                <>
                  <p className="text-muted-foreground mt-4 mb-2 text-xs font-semibold tracking-wide uppercase">
                    Stack Trace
                  </p>
                  <pre className="text-muted-foreground max-h-40 overflow-auto font-mono text-xs">
                    {error.stack}
                  </pre>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
