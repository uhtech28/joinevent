'use client';

// Route error boundary — shown when a page in this tree throws on render.
// Logs to console (and Sentry via window.onerror if wired).

import { useEffect } from 'react';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cream-200 text-3xl">
        ⚠
      </div>
      <h1 className="mb-3 text-3xl font-extrabold text-ink-700">Something went wrong</h1>
      <p className="mb-6 text-ink-500">
        This page hit an unexpected error. Our team has been notified.
      </p>
      {error.digest && (
        <p className="mb-6 rounded-lg bg-cream-100 px-3 py-2 font-mono text-xs text-ink-500">
          Error ref: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <button onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <a href="/" className="btn btn-secondary">
          Go home
        </a>
      </div>
    </div>
  );
}
