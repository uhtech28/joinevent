'use client';

// /dashboard/enquiries — vendor-only inbox of buyer enquiries.
// Each enquiry has product thumb, buyer info, message, owner reply box,
// status pill, time-since. Replying flips status to 'replied' and shows
// the reply inline thereafter.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, type PublicEnquiry } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function EnquiriesPage() {
  const auth = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<PublicEnquiry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    if (auth.user.primaryRole !== 'vendor') {
      router.replace('/dashboard');
      return;
    }
    let alive = true;
    api.enquiries.received()
      .then((rows) => alive && setItems(rows))
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : (err as Error).message));
    return () => { alive = false; };
  }, [auth, auth.status, router]);

  function handleUpdated(updated: PublicEnquiry) {
    setItems((prev) => (prev ?? []).map((x) => (x.id === updated.id ? updated : x)));
  }

  const newCount = (items ?? []).filter((e) => e.status === 'new').length;

  return (
    <div className="space-y-5">
      <header>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">
          Enquiries
        </div>
        <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-navy-800 sm:text-[28px]">
          Buyer enquiries
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {newCount > 0
            ? `${newCount} new — reply to unlock the sale.`
            : 'Replies show up here as buyers reach out about your products.'}
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          ⚠ {error}
        </div>
      )}

      {items === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white shadow-soft" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-brand-purple/30 bg-cream-100 p-10 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-purple/15 text-2xl">
            📬
          </div>
          <h3 className="text-base font-extrabold text-navy-800">No enquiries yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
            When a buyer taps Enquire Now on one of your products their message lands here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((e) => (
            <EnquiryRow key={e.id} enquiry={e} onUpdated={handleUpdated} />
          ))}
        </div>
      )}
    </div>
  );
}

function EnquiryRow({
  enquiry,
  onUpdated,
}: {
  enquiry: PublicEnquiry;
  onUpdated: (e: PublicEnquiry) => void;
}) {
  const [reply, setReply] = useState(enquiry.ownerReply ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const cover = enquiry.product.imageUrls[0];
  const buyer =
    enquiry.buyerName?.trim() ||
    enquiry.fromUser.displayName ||
    'Anonymous buyer';
  const when = new Date(enquiry.createdAt).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

  async function handleReply() {
    if (!reply.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const updated = await api.enquiries.reply(enquiry.id, reply.trim());
      onUpdated(updated);
    } catch (uerr) {
      setErr(uerr instanceof Error ? uerr.message : 'Failed to send reply');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-soft">
      <div className="flex flex-col gap-4 p-4 sm:flex-row">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-cream-200">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={enquiry.product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl text-cream-300">🛍️</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-extrabold text-navy-800">{enquiry.product.name}</h3>
            <StatusPill status={enquiry.status} />
            <span className="ml-auto text-[11px] text-ink-400">{when}</span>
          </div>
          <p className="mt-1 text-xs font-semibold text-ink-700">
            From <span className="text-navy-800">{buyer}</span>
            {enquiry.buyerPhone && (
              <a className="ml-2 text-ribbon-purple hover:underline" href={`tel:${enquiry.buyerPhone}`}>{enquiry.buyerPhone}</a>
            )}
            {enquiry.buyerEmail && (
              <a className="ml-2 text-ribbon-purple hover:underline" href={`mailto:${enquiry.buyerEmail}`}>{enquiry.buyerEmail}</a>
            )}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-navy-800">{enquiry.message}</p>

          {enquiry.ownerReply && enquiry.status === 'replied' ? (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Your reply</div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">{enquiry.ownerReply}</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Reply…"
                rows={2}
                className="input"
              />
              {err && <div className="text-xs font-semibold text-rose-700">⚠ {err}</div>}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleReply}
                  disabled={busy || !reply.trim()}
                  className="rounded-xl bg-purple-gradient px-4 py-2 text-xs font-extrabold text-white shadow-purple disabled:opacity-60"
                >
                  {busy ? 'Sending…' : 'Send reply'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    new: { bg: 'bg-brand-purple/10', text: 'text-brand-purple', label: 'New' },
    read: { bg: 'bg-cream-200', text: 'text-ink-500', label: 'Read' },
    replied: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Replied' },
    closed: { bg: 'bg-cream-200', text: 'text-ink-500', label: 'Closed' },
  };
  const s = map[status] ?? map.new;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}
