'use client';

// /dashboard/notifications — chronological feed.
// Click a notification → marked read + (if it has a link) navigated to it.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError, type ApiNotification } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function NotificationsPage() {
  const auth = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ApiNotification[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status === 'anonymous') router.replace('/login');
  }, [auth.status, router]);

  const refresh = useCallback(async () => {
    try {
      const res = await api.notifications.list();
      setItems(res.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message);
    }
  }, []);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    refresh();
  }, [auth.status, refresh]);

  async function markAllRead() {
    setBusy(true);
    try {
      await api.notifications.markAllRead();
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function click(n: ApiNotification) {
    // Mark read (best-effort) and navigate.
    if (!n.readAt) {
      void api.notifications.markRead(n.id).catch(() => {});
      setItems((prev) =>
        prev ? prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)) : prev,
      );
    }
    if (n.link) router.push(n.link);
  }

  const grouped = items ? groupByBucket(items) : null;
  const anyUnread = items?.some((n) => !n.readAt);

  return (
    <main className="mx-auto max-w-3xl px-4 py-2 sm:px-6 sm:py-4">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-purple hover:underline"
        >
          ← Back to dashboard
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="bg-purple-gradient-text bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
              Notifications
            </h1>
            <p className="mt-1 text-sm text-ink-400">Newest first.</p>
          </div>
          {anyUnread && (
            <button
              type="button"
              onClick={markAllRead}
              disabled={busy}
              className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-ink-600 shadow-card hover:bg-cream-200 disabled:opacity-60"
            >
              {busy ? 'Marking…' : 'Mark all as read'}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!items && !error && (
          <div className="mt-8 grid gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-white shadow-card" />
            ))}
          </div>
        )}

        {items && items.length === 0 && (
          <div className="mt-8 rounded-3xl border-2 border-dashed border-brand-purple/40 bg-cream-200 p-10 text-center">
            <p className="text-base font-bold text-ink-700">Nothing yet 🌱</p>
            <p className="mt-2 text-sm text-ink-400">
              You'll see notifications here when someone reviews your event, books a stall, or
              follows you.
            </p>
          </div>
        )}

        {grouped && grouped.length > 0 && (
          <div className="mt-8 space-y-8">
            {grouped.map(([bucket, list]) => (
              <section key={bucket}>
                <h2 className="mb-3 text-xs font-extrabold uppercase tracking-[0.15em] text-ink-300">
                  {bucket}
                </h2>
                <ul className="grid gap-3">
                  {list.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => click(n)}
                        className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left shadow-card transition hover:-translate-y-0.5 ${
                          n.readAt
                            ? 'border-black/5 bg-white'
                            : 'border-brand-purple/40 bg-cream-200'
                        }`}
                      >
                        <TypeIcon type={n.type} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-ink-700">{n.title}</div>
                          {n.body && (
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-400">
                              {n.body}
                            </p>
                          )}
                          <div className="mt-1.5 text-[11px] text-ink-300">
                            {new Date(n.createdAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                        {!n.readAt && (
                          <span
                            aria-hidden
                            className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-brand-purple"
                          />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
    </main>
  );
}

function TypeIcon({ type }: { type: string }) {
  const emoji =
    {
      booking_received: '🎪',
      review_received: '⭐',
      new_follower: '👤',
      kyc_approved: '✅',
      kyc_rejected: '⚠️',
      event_from_following: '🔔',
    }[type] ?? '🔔';
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-card">
      <span aria-hidden>{emoji}</span>
    </div>
  );
}

function groupByBucket(items: ApiNotification[]): Array<[string, ApiNotification[]]> {
  const today = new Date();
  const yest = new Date(Date.now() - 86400_000);
  const weekAgo = new Date(Date.now() - 7 * 86400_000);
  const buckets: Record<string, ApiNotification[]> = {
    Today: [],
    Yesterday: [],
    'This week': [],
    Earlier: [],
  };
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  for (const n of items) {
    const d = new Date(n.createdAt);
    if (sameDay(d, today)) buckets.Today.push(n);
    else if (sameDay(d, yest)) buckets.Yesterday.push(n);
    else if (d > weekAgo) buckets['This week'].push(n);
    else buckets.Earlier.push(n);
  }
  return Object.entries(buckets).filter(([, list]) => list.length > 0);
}
