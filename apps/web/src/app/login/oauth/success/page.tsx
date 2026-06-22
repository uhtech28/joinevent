'use client';

// OAuth landing page. The API redirects here with tokens in the URL fragment:
//   /login/oauth/success#accessToken=...&refreshToken=...&accessExpiresInSeconds=900
// Fragment is never sent to the server, so it's safer than a query string.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

export default function OauthSuccessPage() {
  const router = useRouter();
  const { handleSession } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Parse the fragment (everything after #).
        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : window.location.hash;
        const params = new URLSearchParams(hash);
        const accessToken = params.get('accessToken');
        const refreshToken = params.get('refreshToken');
        const accessExpiresInSecondsRaw = params.get('accessExpiresInSeconds');
        if (!accessToken || !refreshToken || !accessExpiresInSecondsRaw) {
          throw new Error('Missing tokens in the redirect URL');
        }
        const accessExpiresInSeconds = parseInt(accessExpiresInSecondsRaw, 10);

        // Persist tokens to localStorage via AuthContext, then fetch /auth/me.
        // We don't have the user object from the redirect; ask the server.
        // Simulate the verify response shape so AuthContext is happy.
        const me = await fetchMe(accessToken);
        handleSession({
          user: me,
          tokens: {
            accessToken,
            refreshToken,
            accessExpiresInSeconds,
          },
        });

        // Clean the fragment from the URL bar.
        window.history.replaceState({}, '', '/login/oauth/success');
        router.push(me.onboardedAt ? '/dashboard' : '/onboarding/role');
      } catch (err) {
        setError((err as Error).message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10 text-center">
        <h1 className="text-2xl font-extrabold text-ink-700">Sign-in incomplete</h1>
        <p className="mt-3 text-ink-500">{error}</p>
        <a href="/login" className="btn btn-primary mt-6">
          Back to sign in
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-cream-200 border-t-brand-orange" />
      <h1 className="text-xl font-extrabold text-ink-700">Finishing sign-in…</h1>
      <p className="mt-2 text-sm text-ink-400">One moment.</p>
    </main>
  );
}

// We need to talk to /auth/me but AuthContext hasn't persisted the token yet.
// Use a one-off fetch with the explicit Authorization header.
async function fetchMe(accessToken: string) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
  const res = await fetch(`${apiBase}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Could not load profile (HTTP ${res.status})`);
  return res.json();
}
