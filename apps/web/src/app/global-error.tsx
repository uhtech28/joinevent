'use client';

// Root error boundary — fires when even the layout throws.
// Must define its own <html> + <body> because layout failed.

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: '40px 20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#fff8f0',
          color: '#2b1d13',
          minHeight: '100vh',
        }}
      >
        <div style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
          <h1 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 800 }}>
            We hit a problem
          </h1>
          <p style={{ margin: '0 0 24px', color: '#5a4a3a' }}>
            JoinEvents ran into an unexpected error and couldn&apos;t load the page.
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily: 'monospace',
                fontSize: 12,
                background: '#fff1e0',
                padding: '8px 12px',
                borderRadius: 8,
                display: 'inline-block',
                marginBottom: 24,
              }}
            >
              Ref: {error.digest}
            </p>
          )}
          <div>
            <button
              onClick={reset}
              style={{
                background: '#ff6b35',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                marginRight: 8,
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                background: 'white',
                color: '#3d2f24',
                textDecoration: 'none',
                padding: '12px 24px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 15,
                border: '1px solid rgba(0,0,0,0.1)',
                display: 'inline-block',
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
