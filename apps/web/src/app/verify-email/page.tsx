'use client';

// Email verification landing page. Linked from the verification email:
//   /verify-email?token=abc123...

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';

// Wrap the component using useSearchParams in Suspense — required for
// Next.js 15 prerender of client components.
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailInner() {
  const search = useSearchParams();
  const token = search.get('token');
  const [status, setStatus] = useState<'verifying' | 'ok' | 'error'>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Missing verification token.');
      return;
    }
    api.auth
      .verifyEmail(token)
      .then(() => setStatus('ok'))
      .catch((err) => {
        setStatus('error');
        setError(err instanceof ApiError ? err.message : 'Verification failed');
      });
  }, [token]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      {status === 'verifying' && (
        <>
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-cream-200 border-t-brand-orange" />
          <h1 className="text-xl font-extrabold text-ink-700">Verifying…</h1>
        </>
      )}
      {status === 'ok' && (
        <>
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-3xl">
            ✓
          </div>
          <h1 className="text-2xl font-extrabold text-ink-700">Email verified</h1>
          <p className="mt-2 text-ink-500">You can now use all of JoinEvents.</p>
          <Link href="/dashboard" className="btn btn-primary mt-6">
            Go to dashboard
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-3xl">
            ⚠
          </div>
          <h1 className="text-2xl font-extrabold text-ink-700">Verification failed</h1>
          <p className="mt-2 text-ink-500">{error}</p>
          <Link href="/login" className="btn btn-primary mt-6">
            Back to sign in
          </Link>
        </>
      )}
    </main>
  );
}
