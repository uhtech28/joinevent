'use client';

// ApplyStallButton — opens a modal to submit a stall application.
// Auth-aware: anonymous users are bounced to /login first.

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const CATEGORIES = [
  'food',
  'home-decor',
  'fashion',
  'art',
  'books',
  'services',
  'kids',
  'fitness',
] as const;

export function ApplyStallButton({
  eventSlug,
  eventTitle,
  accepting = true,
}: {
  eventSlug: string;
  eventTitle: string;
  accepting?: boolean;
}) {
  const auth = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // Form state — must be declared BEFORE any early return so the hook order
  // stays stable across re-renders (otherwise React throws
  // "Rendered fewer hooks than expected").
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState<string>('food');
  const [productType, setProductType] = useState('');
  const [message, setMessage] = useState('');

  // Only stall owners (vendors) can submit applications. Anonymous viewers
  // also see the CTA so we can funnel them through /login → vendor signup.
  // Regular users and organisers don't need this button and would just be
  // confused by it, so we hide it for them entirely.
  const role = auth.status === 'authenticated' ? auth.user.primaryRole : null;
  const canShow =
    auth.status === 'loading' ||
    auth.status === 'anonymous' ||
    role === 'vendor';
  if (!canShow) return null;

  function openDialog() {
    if (auth.status !== 'authenticated') {
      router.push(`/login?next=${encodeURIComponent(`/events/${eventSlug}`)}`);
      return;
    }
    setOpen(true);
    setError(null);
    setSuccess(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!businessName.trim()) {
      setError('Business name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.applications.submit(eventSlug, {
        businessName: businessName.trim(),
        category,
        productType: productType.trim() || undefined,
        message: message.trim() || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        disabled={!accepting}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-gradient px-5 py-3 text-sm font-extrabold text-white shadow-purple ring-1 ring-inset ring-white/15 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        📨 Apply for a stall
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-black/[0.06] px-6 py-4">
              <h2 className="text-base font-extrabold text-navy-800">Apply for a stall</h2>
              <p className="mt-0.5 text-xs text-ink-500">{eventTitle}</p>
            </div>

            {success ? (
              <div className="px-6 py-8 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-100 text-2xl">
                  ✓
                </div>
                <h3 className="text-base font-extrabold text-navy-800">Application submitted</h3>
                <p className="mt-1 text-sm text-ink-500">
                  The organiser will review and respond. You can track the status under
                  <strong> Bookings</strong>.
                </p>
                <div className="mt-5 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      router.push('/dashboard/bookings');
                    }}
                    className="rounded-xl bg-purple-gradient px-4 py-2 text-xs font-extrabold text-white shadow-purple"
                  >
                    Go to my applications →
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4 px-6 py-5">
                <Field label="Business name" required>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={120}
                    placeholder="e.g. The Boho Town"
                    className={inputClass}
                  />
                </Field>

                <Field label="Category" required>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={inputClass}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.replace(/-/g, ' ')}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Products you'll sell">
                  <input
                    type="text"
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    maxLength={120}
                    placeholder="e.g. Handmade ceramics, jewellery"
                    className={inputClass}
                  />
                </Field>

                <Field label="Message to organiser" hint="Optional — make your pitch.">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    placeholder="Why you'd be a great fit for this event…"
                    className={`${inputClass} resize-y`}
                  />
                </Field>

                {error && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    ⚠ {error}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={busy}
                    className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-bold text-navy-700 transition hover:bg-cream-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-xl bg-purple-gradient px-4 py-2 text-xs font-extrabold text-white shadow-purple disabled:opacity-50"
                  >
                    {busy ? 'Submitting…' : 'Submit application'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-ink-500">
        {label}
        {required && <span className="text-ribbon-purple">*</span>}
      </span>
      {children}
      {hint && <p className="mt-1 text-[11px] text-ink-400">{hint}</p>}
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-black/10 bg-cream-50 px-3 py-2 text-sm font-medium text-navy-800 outline-none transition focus:border-ribbon-purple/40 focus:bg-white focus:ring-2 focus:ring-ribbon-purple/15';
