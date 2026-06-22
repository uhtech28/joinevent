'use client';

// /admin/withdrawals — pending payout queue.

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type ApiWithdrawal } from '@/lib/api';

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

export default function AdminWithdrawalsPage() {
  const [items, setItems] = useState<Array<ApiWithdrawal & { userLabel: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [openReject, setOpenReject] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await api.withdrawals.pending();
      setItems(list);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function decide(id: string, approve: boolean) {
    setBusy(id);
    try {
      await api.withdrawals.decide(id, approve, note.trim() || undefined);
      setNote('');
      setOpenReject(null);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-extrabold text-ink-700 sm:text-3xl">Withdrawals</h1>
      <p className="mt-1 text-sm text-ink-400">Pending payout requests, oldest first.</p>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!items && (
        <div className="mt-6 grid gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white shadow-card" />
          ))}
        </div>
      )}

      {items && items.length === 0 && (
        <p className="mt-6 rounded-2xl border-2 border-dashed border-emerald-300/40 bg-emerald-50 p-8 text-center text-sm text-emerald-700">
          No pending withdrawals.
        </p>
      )}

      {items && items.length > 0 && (
        <ul className="mt-6 grid gap-3">
          {items.map((w) => (
            <li key={w.id} className="rounded-2xl border border-black/5 bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-bold text-ink-700">{inr(w.amountPaise)}</div>
                  <p className="text-xs text-ink-300">
                    by {w.userLabel} · fee {inr(w.feePaise)}
                  </p>
                  <p className="mt-2 text-sm text-ink-400">
                    <strong className="text-ink-700">{w.accountHolder}</strong> · A/c{' '}
                    {w.bankAccountRef} · IFSC {w.ifsc}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => decide(w.id, true)}
                    disabled={busy === w.id}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {busy === w.id ? '…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenReject((id) => (id === w.id ? null : w.id))}
                    className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
              {openReject === w.id && (
                <div className="mt-3 grid gap-2">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Note (visible to user)"
                    rows={2}
                    className="rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-orange"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => decide(w.id, false)}
                      className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white"
                    >
                      Confirm reject
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
