'use client';

// /dashboard/applications — organiser inbox for vendor applications.
// Status tabs · search · approve / reject from inline action buttons.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  api,
  ApiError,
  type ApplicationStatus,
  type ApplicationStatusFilter,
  type PublicApplication,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const STATUS_TABS: { key: ApplicationStatusFilter; label: string; tone: string }[] = [
  { key: 'all', label: 'All', tone: 'bg-navy-800 text-white' },
  { key: 'submitted', label: 'New', tone: 'bg-blue-100 text-blue-700' },
  { key: 'under_review', label: 'Under review', tone: 'bg-orange-100 text-orange-700' },
  { key: 'approved', label: 'Approved', tone: 'bg-emerald-100 text-emerald-700' },
  { key: 'rejected', label: 'Rejected', tone: 'bg-rose-100 text-rose-700' },
  { key: 'booked', label: 'Booked', tone: 'bg-ribbon-purple/15 text-ribbon-purple' },
];

export default function ApplicationsPage() {
  const auth = useAuth();
  const [filter, setFilter] = useState<ApplicationStatusFilter>('all');
  const [apps, setApps] = useState<PublicApplication[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await api.applications.received(filter);
      setApps(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
      setApps([]);
    }
  }, [filter]);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    void load();
  }, [auth.status, load]);

  async function decide(
    app: PublicApplication,
    decision: 'approve' | 'reject' | 'under_review',
  ) {
    if (busyId) return;
    let reason: string | undefined;
    if (decision === 'reject') {
      reason = window.prompt('Reason for rejection (optional, vendor will see this):') ?? undefined;
      if (reason === null) return;
    }
    setBusyId(app.id);
    try {
      const next = await api.applications.decide(app.id, { decision, rejectionReason: reason });
      // Optimistic local update — keep them in the list but with new status,
      // then re-fetch so counts on the tab bar update.
      setApps((prev) => prev?.map((a) => (a.id === app.id ? next : a)) ?? null);
      void load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  // Tab counts derived from the loaded list — when filtered, only the count for
  // the selected status will be accurate. For "All" the entire list is loaded.
  const counts: Record<ApplicationStatusFilter, number> = {
    all: apps?.length ?? 0,
    submitted: apps?.filter((a) => a.status === 'submitted').length ?? 0,
    under_review: apps?.filter((a) => a.status === 'under_review').length ?? 0,
    approved: apps?.filter((a) => a.status === 'approved').length ?? 0,
    rejected: apps?.filter((a) => a.status === 'rejected').length ?? 0,
    payment_pending: apps?.filter((a) => a.status === 'payment_pending').length ?? 0,
    booked: apps?.filter((a) => a.status === 'booked').length ?? 0,
  };

  return (
    <div className="space-y-5">
      <header>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-ribbon-purple">
          Organiser inbox
        </div>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy-800 sm:text-[32px]">
          Applications
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Vendor applications to book stalls at your events. Approve, reject, or move them to
          under-review.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1">
        {STATUS_TABS.map((t) => {
          const active = filter === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                active
                  ? 'bg-navy-800 text-white'
                  : 'text-ink-500 hover:bg-cream-100 hover:text-navy-800'
              }`}
            >
              {t.label}
              <span className={`tabular-nums text-[11px] ${active ? 'text-white/70' : 'text-ink-300'}`}>
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          ⚠ {error}
        </div>
      )}

      {apps === null && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white shadow-soft" />
          ))}
        </div>
      )}

      {apps && apps.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-ribbon-purple/30 bg-cream-100 p-10 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-ribbon-purple/15 text-2xl">
            📨
          </div>
          <h3 className="text-base font-extrabold text-navy-800">No applications match this filter</h3>
          <p className="mt-1 text-sm text-ink-500">
            When vendors apply to your events, they appear here.
          </p>
        </div>
      )}

      {apps && apps.length > 0 && (
        <div className="space-y-3">
          {apps.map((app) => (
            <ApplicationRow
              key={app.id}
              app={app}
              busy={busyId === app.id}
              onDecide={(decision) => decide(app, decision)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// One application row
// ============================================================
function ApplicationRow({
  app,
  busy,
  onDecide,
}: {
  app: PublicApplication;
  busy: boolean;
  onDecide: (decision: 'approve' | 'reject' | 'under_review') => void;
}) {
  const initials =
    app.applicant.displayName
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('') ||
    app.businessName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('');

  const isTerminal = app.status === 'rejected' || app.status === 'booked';

  return (
    <article className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start gap-4">
        {/* Avatar */}
        {app.applicant.profileAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={app.applicant.profileAvatarUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-gradient text-sm font-extrabold text-white ring-2 ring-white">
            {initials || '?'}
          </div>
        )}

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-extrabold text-navy-800">{app.businessName}</h3>
            <StatusPill status={app.status} />
          </div>
          <div className="mt-0.5 text-[11px] text-ink-400">
            {app.applicant.profileUsername ? (
              <Link
                href={`/org/${app.applicant.profileUsername}`}
                className="font-semibold text-ink-500 hover:text-ribbon-purple hover:underline"
              >
                @{app.applicant.profileUsername}
              </Link>
            ) : (
              <span>{app.applicant.displayName ?? 'Vendor'}</span>
            )}
            <span className="mx-1 text-ink-300">·</span>
            <span>{app.category}</span>
            {app.productType && (
              <>
                <span className="mx-1 text-ink-300">·</span>
                <span>{app.productType}</span>
              </>
            )}
          </div>
          {app.message && (
            <p className="mt-2 whitespace-pre-wrap rounded-xl border border-black/[0.06] bg-cream-50 px-3 py-2 text-[13px] leading-relaxed text-ink-600">
              {app.message}
            </p>
          )}
          {app.rejectionReason && (
            <p className="mt-2 text-xs text-rose-700">
              <strong>Rejection note:</strong> {app.rejectionReason}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-400">
            <span>
              For:{' '}
              <Link
                href={`/events/${app.event.slug}`}
                className="font-semibold text-ribbon-purple hover:underline"
              >
                {app.event.title}
              </Link>
            </span>
            <span className="text-ink-300">·</span>
            <span>{timeAgo(app.createdAt)}</span>
          </div>
        </div>

        {/* Actions */}
        {!isTerminal && (
          <div className="flex flex-wrap gap-2">
            {app.status === 'submitted' && (
              <button
                type="button"
                onClick={() => onDecide('under_review')}
                disabled={busy}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold text-navy-700 transition hover:bg-cream-100 disabled:opacity-50"
              >
                Mark reviewing
              </button>
            )}
            <button
              type="button"
              onClick={() => onDecide('approve')}
              disabled={busy}
              className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-extrabold text-white shadow-soft transition hover:bg-emerald-600 disabled:opacity-50"
            >
              {busy ? '…' : 'Approve'}
            </button>
            <button
              type="button"
              onClick={() => onDecide('reject')}
              disabled={busy}
              className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function StatusPill({ status }: { status: ApplicationStatus }) {
  const map: Record<ApplicationStatus, { label: string; tone: string }> = {
    submitted: { label: 'New', tone: 'bg-blue-100 text-blue-700' },
    under_review: { label: 'Under review', tone: 'bg-orange-100 text-orange-700' },
    approved: { label: 'Approved', tone: 'bg-emerald-100 text-emerald-700' },
    rejected: { label: 'Rejected', tone: 'bg-rose-100 text-rose-700' },
    payment_pending: { label: 'Payment pending', tone: 'bg-amber-100 text-amber-700' },
    booked: { label: 'Booked', tone: 'bg-ribbon-purple/15 text-ribbon-purple' },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${s.tone}`}>
      {s.label}
    </span>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
