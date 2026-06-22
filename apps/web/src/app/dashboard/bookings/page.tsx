'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError, type ApiBooking } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

export default function BookingsPage() {
  const auth = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<ApiBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status === 'anonymous') router.replace('/login');
  }, [auth.status, router]);

  const refresh = useCallback(async () => {
    try {
      const list = await api.bookings.mine();
      setBookings(list);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message);
    }
  }, []);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    refresh();
  }, [auth.status, refresh]);

  async function cancel(b: ApiBooking) {
    if (!confirm(`Cancel this booking? ${inr(b.amountPaise)} will be refunded to your wallet.`)) return;
    setBusyId(b.id);
    try {
      const res = await api.bookings.cancel(b.id);
      alert(`Refunded ${inr(res.refundedPaise)}. Wallet balance: ${inr(res.newWalletBalancePaise)}.`);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message);
    } finally {
      setBusyId(null);
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

        <h1 className="bg-purple-gradient-text bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
          Your bookings
        </h1>
        <p className="mt-2 text-ink-400">Stalls you&apos;ve reserved at events.</p>

        {error && (
          <div className="mt-6 rounded-xl border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!bookings && !error && (
          <div className="mt-10 h-32 animate-pulse rounded-2xl bg-white shadow-card" />
        )}

        {bookings && bookings.length === 0 && (
          <div className="mt-10 rounded-3xl border-2 border-dashed border-brand-purple/40 bg-cream-200 p-10 text-center">
            <p className="text-ink-700">No bookings yet.</p>
            <p className="mt-2 text-sm text-ink-400">
              Browse events and book a stall to get started.
            </p>
            <Link href="/events" className="btn btn-primary mt-5 inline-flex">
              Browse events
            </Link>
          </div>
        )}

        {bookings && bookings.length > 0 && (
          <ul className="mt-8 grid gap-3">
            {bookings.map((b) => (
              <li key={b.id} className="rounded-2xl border border-black/5 bg-white p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {b.event && (
                      <Link
                        href={`/events/${b.event.slug}`}
                        className="text-base font-bold text-ink-700 hover:text-brand-purple"
                      >
                        {b.event.title}
                      </Link>
                    )}
                    <p className="mt-0.5 text-xs text-ink-300">
                      {b.event &&
                        new Date(b.event.startsAt).toLocaleString('en-IN', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}{' '}
                      · {b.event?.addressText}
                    </p>
                    {b.stall && (
                      <p className="mt-1 text-sm text-ink-400">
                        Category: <strong className="text-ink-700">{b.stall.category}</strong>
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      b.status === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : b.status === 'cancelled'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-cream-200 text-ink-400'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <dt className="text-ink-300">Paid</dt>
                    <dd className="font-bold text-ink-700">{inr(b.amountPaise)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-300">Platform fee</dt>
                    <dd className="font-bold text-ink-700">{inr(b.platformFeePaise)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-300">Organiser</dt>
                    <dd className="font-bold text-ink-700">{inr(b.escrowHeldPaise)}</dd>
                  </div>
                </dl>

                {b.status === 'confirmed' && (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => cancel(b)}
                      disabled={busyId === b.id}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                    >
                      {busyId === b.id ? 'Cancelling…' : 'Cancel & refund'}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
    </main>
  );
}
