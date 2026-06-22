'use client';

// /admin — platform overview dashboard.

import { useEffect, useState } from 'react';
import { api, ApiError, type AdminOverview } from '@/lib/api';

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.admin
      .overview()
      .then(setData)
      .catch((err) =>
        setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message),
      );
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white shadow-card" />
        ))}
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-extrabold text-ink-700 sm:text-3xl">Overview</h1>
      <p className="mt-1 text-sm text-ink-400">A live snapshot of the platform.</p>

      {/* Ledger pill — highest signal */}
      <div
        className={`mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
          data.ledger.balanced
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-rose-100 text-rose-700'
        }`}
      >
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            data.ledger.balanced ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        />
        Ledger {data.ledger.balanced ? 'balanced' : 'OUT OF BALANCE'} · D {inr(data.ledger.debitsPaise)} = C{' '}
        {inr(data.ledger.creditsPaise)}
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Users" lines={[
          [`${data.users.total}`, 'total'],
          [`${data.users.verified}`, 'verified'],
          [`${data.users.admins}`, 'admins'],
        ]} />
        <Card title="Business profiles" lines={[
          [`${data.businessProfiles.total}`, 'total'],
          [`${data.businessProfiles.verified}`, 'verified'],
          [`${data.businessProfiles.pendingKyc}`, 'pending KYC', data.businessProfiles.pendingKyc > 0 ? 'highlight' : ''],
        ]} />
        <Card title="Events" lines={[
          [`${data.events.live}`, 'live'],
          [`${data.events.draft}`, 'draft'],
          [`${data.events.cancelled}`, 'cancelled'],
        ]} />
        <Card title="Bookings" lines={[
          [`${data.bookings.confirmed}`, 'confirmed'],
          [`${data.bookings.released}`, 'released'],
          [`${data.bookings.cancelled}`, 'cancelled'],
        ]} />
        <Card title="Reviews" lines={[
          [`${data.reviews.total}`, 'total'],
          [`${data.reviews.flagged}`, 'flagged', data.reviews.flagged > 0 ? 'highlight' : ''],
        ]} />
        <Card title="Admin activity (7d)" lines={[
          [`${data.recentAuditCount}`, 'audit log entries'],
        ]} />
      </section>
    </>
  );
}

function Card({
  title,
  lines,
}: {
  title: string;
  lines: Array<[string, string] | [string, string, string]>;
}) {
  return (
    <article className="rounded-2xl border border-black/5 bg-white p-5 shadow-card">
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-ink-300">{title}</div>
      <ul className="mt-2 grid gap-1">
        {lines.map(([num, label, mod], i) => (
          <li key={i} className="flex items-baseline justify-between">
            <span className="text-xs text-ink-400">{label}</span>
            <span
              className={`text-lg font-extrabold ${
                mod === 'highlight' ? 'text-brand-orange' : 'text-ink-700'
              }`}
            >
              {num}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
