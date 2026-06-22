'use client';

// Password reset page. Linked from the reset email:
//   /reset-password?token=abc123...

import { useState, Suspense, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';

// Wrap the component using useSearchParams in Suspense — required for
// Next.js 15 prerender of client components.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setError('Missing reset token.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.auth.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Reset failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <Link
        href="/login"
        className="mb-8 inline-flex items-center gap-1 text-sm font-semibold text-brand-orange hover:underline"
      >
        ← Back to sign in
      </Link>
      <h1 className="text-3xl font-extrabold text-ink-700">Set a new password</h1>
      <p className="mt-2 text-ink-500">Choose something strong. Min 8 characters with a letter and a digit.</p>

      {done ? (
        <div className="mt-8 rounded-2xl border border-emerald-300/40 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
          ✓ Password updated. Redirecting to sign in…
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink-600">New password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              autoFocus
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base font-medium shadow-soft outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink-600">Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base font-medium shadow-soft outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || password.length < 8 || confirm.length < 8}
            className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      )}
    </main>
  );
}
