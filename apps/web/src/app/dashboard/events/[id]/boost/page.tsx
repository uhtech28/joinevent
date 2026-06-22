'use client';

// /dashboard/events/[id]/boost — buy a Featured listing.

import { useEffect, useState } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError, type FeaturedTierInfo, type FeaturedTier } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

export default function BoostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const auth = useAuth();
  const router = useRouter();
  const [tiers, setTiers] = useState<FeaturedTierInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ endsAt: string; tier: FeaturedTier } | null>(null);
  const [busyTier, setBusyTier] = useState<FeaturedTier | null>(null);

  useEffect(() => {
    if (auth.status === 'anonymous') router.replace('/login');
  }, [auth.status, router]);

  useEffect(() => {
    api.featured.tiers().then(setTiers).catch(() => {});
  }, []);

  async function buy(tier: FeaturedTier) {
    setBusyTier(tier);
    setError(null);
    try {
      const res = await api.featured.boost(id, tier);
      setSuccess({ endsAt: res.featured.endsAt, tier });
    } catch (err) {
      setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message);
    } finally {
      setBusyTier(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-2 sm:px-6 sm:py-4">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-purple hover:underline"
        >
          ← Back to dashboard
        </Link>

        <h1 className="bg-purple-gradient-text bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
          Boost this event
        </h1>
        <p className="mt-2 text-ink-400">
          Pay from your wallet to feature this event at the top of discovery.
        </p>

        {success && (
          <div className="mt-6 rounded-2xl border border-emerald-300/40 bg-emerald-50 p-5 text-sm text-emerald-700">
            ✅ Boost activated. Featured until{' '}
            <strong>{new Date(success.endsAt).toLocaleString('en-IN')}</strong>.
            <div className="mt-3">
              <Link href="/dashboard" className="btn btn-primary !py-2">
                Back to dashboard
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!tiers && <div className="mt-8 h-40 animate-pulse rounded-2xl bg-white shadow-card" />}

        {tiers && !success && (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {tiers.map((t) => (
              <article
                key={t.tier}
                className={`rounded-3xl border bg-white p-6 shadow-card ${
                  t.tier === 'spotlight' ? 'border-brand-purple shadow-hover lg:-translate-y-2' : 'border-black/5'
                }`}
              >
                <div className="text-xs font-extrabold uppercase tracking-wide text-brand-purple">
                  {t.label}
                </div>
                <div className="mt-2 text-3xl font-extrabold text-ink-700">{inr(t.pricePaise)}</div>
                <p className="mt-2 text-xs text-ink-300">{t.durationDays} day(s) of priority</p>
                <button
                  type="button"
                  onClick={() => buy(t.tier)}
                  disabled={busyTier === t.tier}
                  className="btn btn-primary mt-5 w-full disabled:opacity-60"
                >
                  {busyTier === t.tier ? 'Buying…' : `Buy ${t.label}`}
                </button>
              </article>
            ))}
          </div>
        )}
    </main>
  );
}
