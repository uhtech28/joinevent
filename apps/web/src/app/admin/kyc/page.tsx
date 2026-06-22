'use client';

// /admin/kyc — pending KYC submissions queue.
//
// Workflow:
//   - Click "Approve" → optional note → instant approve, row removed.
//   - Click "Reject" → required reason + optional note → reject.
// Both call AdminService inside a transaction with audit log insertion.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type PendingKycCase } from '@/lib/api';

const REJECT_REASONS = [
  { v: 'docs_unreadable', label: 'Documents unreadable' },
  { v: 'docs_mismatch', label: 'Documents mismatch identity' },
  { v: 'duplicate_account', label: 'Duplicate account' },
  { v: 'suspicious_activity', label: 'Suspicious activity' },
  { v: 'incomplete_information', label: 'Incomplete information' },
  { v: 'other', label: 'Other (see note)' },
] as const;

type RejectReason = (typeof REJECT_REASONS)[number]['v'];

export default function KycQueuePage() {
  const [cases, setCases] = useState<PendingKycCase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [openReject, setOpenReject] = useState<string | null>(null); // profileId
  const [note, setNote] = useState('');
  const [reason, setReason] = useState<RejectReason>('docs_unreadable');

  const refresh = useCallback(async () => {
    try {
      const list = await api.admin.listPendingKyc();
      setCases(list);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function approve(profileId: string) {
    setActingId(profileId);
    try {
      await api.admin.approveKyc(profileId, note.trim() || undefined);
      setNote('');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message);
    } finally {
      setActingId(null);
    }
  }

  async function reject(profileId: string) {
    setActingId(profileId);
    try {
      await api.admin.rejectKyc(profileId, { reason, note: note.trim() || undefined });
      setNote('');
      setOpenReject(null);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message);
    } finally {
      setActingId(null);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-extrabold text-ink-700 sm:text-3xl">KYC Queue</h1>
      <p className="mt-1 text-sm text-ink-400">
        Business profiles awaiting verification. Older submissions first.
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!cases && (
        <div className="mt-6 grid gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-white shadow-card" />
          ))}
        </div>
      )}

      {cases && cases.length === 0 && (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-emerald-300/40 bg-emerald-50 p-10 text-center">
          <p className="text-base font-bold text-emerald-700">🎉 Queue is empty.</p>
          <p className="mt-1 text-sm text-emerald-700/70">
            All pending KYC submissions have been actioned.
          </p>
        </div>
      )}

      {cases && cases.length > 0 && (
        <ul className="mt-6 grid gap-3">
          {cases.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border border-black/5 bg-white p-5 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/org/${c.username}`}
                    className="text-lg font-bold text-ink-700 hover:underline"
                  >
                    {c.displayName}
                  </Link>
                  <p className="text-xs text-ink-300">
                    @{c.username} · <span className="uppercase">{c.type}</span>
                  </p>
                  {c.bio && (
                    <p className="mt-2 text-sm text-ink-400 line-clamp-2">{c.bio}</p>
                  )}
                  <div className="mt-2 grid gap-1 text-xs text-ink-400">
                    {c.user.phone && <div>📱 {c.user.phone}</div>}
                    {c.user.email && <div>✉ {c.user.email}</div>}
                    {c.user.city && <div>📍 {c.user.city}</div>}
                    <div>Account created: {new Date(c.user.createdAt).toLocaleString('en-IN')}</div>
                  </div>
                  {c.flags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {c.flags.map((f) => (
                        <span
                          key={f}
                          className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700"
                        >
                          ⚠ {f.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={() => approve(c.id)}
                    disabled={actingId === c.id}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow disabled:opacity-60"
                  >
                    {actingId === c.id ? '…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenReject((id) => (id === c.id ? null : c.id));
                      setReason('docs_unreadable');
                      setNote('');
                    }}
                    disabled={actingId === c.id}
                    className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>

              {openReject === c.id && (
                <div className="mt-4 rounded-2xl bg-cream-warm p-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-ink-600">Reason</span>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value as RejectReason)}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-brand-orange"
                    >
                      {REJECT_REASONS.map((r) => (
                        <option key={r.v} value={r.v}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="mt-3 block">
                    <span className="mb-1.5 block text-xs font-semibold text-ink-600">
                      Note (optional, visible internally)
                    </span>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      maxLength={500}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-brand-orange"
                    />
                  </label>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => reject(c.id)}
                      disabled={actingId === c.id}
                      className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow disabled:opacity-60"
                    >
                      Confirm reject
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenReject(null)}
                      className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold text-ink-600 hover:bg-cream-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
