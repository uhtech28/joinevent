'use client';

// /dashboard/profile/new — one-time form to become an organiser.
// Creates a business_profile of type 'organiser'.

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const slug = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 32);

export default function NewProfilePage() {
  const router = useRouter();
  const auth = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the user hasn't typed a username yet, derive it from the display name.
  const effectiveUsername = username.trim() || slug(displayName);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.profiles.create({
        username: effectiveUsername,
        displayName: displayName.trim(),
        type: 'organiser',
        bio: bio.trim() || undefined,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message);
      setBusy(false);
    }
  }

  if (auth.status === 'anonymous') {
    return (
      <main className="mx-auto max-w-md p-10 text-center">
        <p>You need to be signed in.</p>
        <Link href="/login" className="btn btn-primary mt-4 inline-flex">
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-2 sm:px-6 sm:py-4">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-purple hover:underline"
        >
          ← Back to dashboard
        </Link>

        <h1 className="bg-purple-gradient-text bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
          Become an organiser
        </h1>
        <p className="mt-2 text-ink-400">
          Your public face on Join Events. People will follow you and see all your events.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <Field
            label="Display name"
            hint="Your event brand or RWA name. People see this on event cards."
          >
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoFocus
              maxLength={80}
              placeholder="e.g. Green Acres RWA"
              className="input"
            />
          </Field>

          <Field
            label="Username"
            hint={`Your URL: joinevents.in/org/${effectiveUsername || '…'}`}
          >
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(slug(e.target.value))}
              placeholder={slug(displayName) || 'username'}
              maxLength={32}
              className="input"
            />
          </Field>

          <Field label="Bio (optional)" hint="One line — what kinds of events you run.">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={400}
              placeholder="e.g. Society fairs, Diwali bazaars, kids carnivals — Sector 76 Noida."
              className="input"
            />
          </Field>

          {error && (
            <div className="rounded-xl border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !displayName.trim()}
            className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Creating profile…' : 'Create profile'}
          </button>
        </form>
      <style>{`.input{
        width:100%;
        border-radius:1rem;
        border:1px solid rgba(0,0,0,.1);
        background:#fff;
        padding:0.75rem 1rem;
        font-size:0.95rem;
        outline:none;
        box-shadow:0 4px 12px rgba(0,0,0,.04);
      }
      .input:focus{
        border-color:#ff6b35;
        box-shadow:0 0 0 3px rgba(255,107,53,.18);
      }`}</style>
    </main>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink-600">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink-300">{hint}</span>}
    </label>
  );
}
