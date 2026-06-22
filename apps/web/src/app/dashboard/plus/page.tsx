'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError, type ApiPlan, type ApiSubscription } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

export default function PlusPage() {
  const auth = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [mine, setMine] = useState<ApiSubscription[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status === 'anonymous') router.replace('/login');
  }, [auth.status, router]);

  const refresh = useCallback(async () => {
    try {
      const [ps, ms] = await Promise.all([api.subscriptions.plans(), api.subscriptions.mine()]);
      setPlans(ps);
      setMine(ms);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message);
    }
  }, []);

  useEffect(() => {
    if (auth.status === 'authenticated') refresh();
  }, [auth.status, refresh]);

  async function buy(code: string) {
    setBusy(code);
    try {
      await api.subscriptions.subscribe(code);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function cancel(id: string) {
    if (!confirm('Cancel this subscription? You keep access until the next billing date.')) return;
    setBusy(id);
    try {
      await api.subscriptions.cancel(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const subscribedCodes = new Set(
    mine.filter((m) => m.status === 'active' || m.status === 'past_due').map((m) => m.planCode),
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-2 sm:px-6 sm:py-4">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-purple hover:underline"
        >
          ← Back to dashboard
        </Link>

        <h1 className="bg-purple-gradient-text bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-5xl">
          Plus subscriptions
        </h1>
        <p className="mt-2 text-ink-400">
          Premium perks for residents, vendors, and organisers. Billed monthly from your wallet.
        </p>

        {error && (
          <div className="mt-6 rounded-xl border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {mine.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-bold text-ink-700">Active subscriptions</h2>
            <ul className="mt-3 grid gap-3">
              {mine.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-2xl border border-black/5 bg-white p-4 shadow-card"
                >
                  <div>
                    <div className="text-sm font-bold text-ink-700">{s.planName}</div>
                    <div className="text-xs text-ink-300">
                      {s.status} · next: {new Date(s.nextBillingAt).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  {s.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => cancel(s.id)}
                      disabled={busy === s.id}
                      className="rounded-xl border border-black/10 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((p, i) => (
            <article
              key={p.id}
              className={`rounded-3xl border bg-white p-6 shadow-card ${
                i === 1 ? 'border-brand-purple shadow-hover lg:-translate-y-2' : 'border-black/5'
              }`}
            >
              <div className="text-xs font-extrabold uppercase tracking-wide text-brand-purple">
                {p.name}
              </div>
              <div className="mt-2 text-3xl font-extrabold text-ink-700">{inr(p.pricePaise)}</div>
              <p className="text-xs text-ink-300">per month</p>
              <ul className="mt-5 grid gap-2 text-sm text-ink-400">
                {p.benefits.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="text-emerald-600">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => buy(p.code)}
                disabled={busy === p.code || subscribedCodes.has(p.code)}
                className="btn btn-primary mt-6 w-full disabled:opacity-60"
              >
                {subscribedCodes.has(p.code)
                  ? 'Subscribed'
                  : busy === p.code
                    ? 'Subscribing…'
                    : 'Subscribe'}
              </button>
            </article>
          ))}
        </section>
    </main>
  );
}
