'use client';

// /admin/audit-log — immutable log of every admin action.

import { useEffect, useState } from 'react';
import { api, ApiError, type AdminAuditEntry } from '@/lib/api';

export default function AuditLogPage() {
  const [items, setItems] = useState<AdminAuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.admin
      .auditLog()
      .then(setItems)
      .catch((err) =>
        setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message),
      );
  }, []);

  return (
    <>
      <h1 className="text-2xl font-extrabold text-ink-700 sm:text-3xl">Audit Log</h1>
      <p className="mt-1 text-sm text-ink-400">
        Every admin action is recorded immutably. Newest first.
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!items && (
        <div className="mt-6 grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white shadow-card" />
          ))}
        </div>
      )}

      {items && items.length === 0 && (
        <p className="mt-6 rounded-2xl border-2 border-dashed border-brand-orange/40 bg-cream-200 p-8 text-center text-sm text-ink-400">
          No admin actions yet.
        </p>
      )}

      {items && items.length > 0 && (
        <ul className="mt-6 grid gap-3">
          {items.map((e) => (
            <li key={e.id} className="rounded-2xl border border-black/5 bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-ink-700">
                    <ActionPill action={e.action} />
                    <span className="ml-2 text-ink-400">on</span>{' '}
                    <code className="rounded bg-cream-200 px-1.5 py-0.5 text-xs">
                      {e.targetTable}/{e.targetId.slice(0, 8)}…
                    </code>
                  </div>
                  <div className="mt-1 text-xs text-ink-300">
                    by <strong className="text-ink-700">{e.actor.label}</strong> ·{' '}
                    {new Date(e.createdAt).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                  {e.note && (
                    <p className="mt-2 rounded-xl bg-cream-warm px-3 py-2 text-sm italic text-ink-400">
                      “{e.note}”
                    </p>
                  )}
                  {Object.keys(e.diff).length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-bold text-brand-orange-dark hover:underline">
                        Show diff
                      </summary>
                      <pre className="mt-2 overflow-x-auto rounded-xl bg-ink-900 p-3 text-[11px] text-emerald-300">
{JSON.stringify(e.diff, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ActionPill({ action }: { action: string }) {
  const colors: Record<string, string> = {
    approve_kyc: 'bg-emerald-100 text-emerald-700',
    reject_kyc: 'bg-rose-100 text-rose-700',
    take_down_event: 'bg-amber-100 text-amber-700',
    manual_adjustment: 'bg-purple-100 text-purple-700',
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
        colors[action] ?? 'bg-cream-200 text-ink-600'
      }`}
    >
      {action.replace(/_/g, ' ')}
    </span>
  );
}
