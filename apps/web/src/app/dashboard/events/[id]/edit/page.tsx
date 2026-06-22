'use client';

// /dashboard/events/[id]/edit — edit a draft or live event.

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError, type OwnerEvent } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { MultiImageUploader } from '@/components/profile/MultiImageUploader';

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const eventId = params?.id ?? '';
  const router = useRouter();
  const auth = useAuth();

  const [event, setEvent] = useState<OwnerEvent | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [addressText, setAddressText] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [coverImageUrls, setCoverImageUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.status !== 'authenticated' || !eventId) return;
    (async () => {
      try {
        const mine = await api.events.mine();
        const ev = mine.find((x) => x.id === eventId);
        if (!ev) {
          setError('Event not found in your events.');
          setLoaded(true);
          return;
        }
        setEvent(ev);
        setTitle(ev.title);
        setDescription(ev.description ?? '');
        setAddressText(ev.addressText);
        setStartsAt(toLocalInput(ev.startsAt));
        setEndsAt(toLocalInput(ev.endsAt));
        setCoverImageUrls(ev.coverImages ?? []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : (err as Error).message);
      } finally {
        setLoaded(true);
      }
    })();
  }, [auth.status, eventId]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!event) return;
    setBusy(true);
    setError(null);
    try {
      await api.events.update(event.id, {
        title: title.trim(),
        description: description.trim(),
        addressText: addressText.trim(),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        coverImageUrls,
      });
      router.push('/dashboard/events');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
      setBusy(false);
    }
  }

  async function onSubmit() {
    if (!event) return;
    setBusy(true);
    setError(null);
    try {
      await api.events.submit(event.id);
      router.push('/dashboard/events');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <div className="space-y-4">
        <div className="h-12 w-64 animate-pulse rounded-xl bg-white shadow-soft" />
        <div className="h-96 animate-pulse rounded-3xl bg-white shadow-soft" />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center">
        <p className="text-sm text-rose-700">⚠ {error}</p>
        <Link href="/dashboard/events" className="mt-4 inline-block text-sm font-bold text-brand-purple">
          ← Back to events
        </Link>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <header>
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-purple hover:underline"
        >
          ← Back to events
        </Link>
        <div className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-ribbon-purple">
          Edit Event
        </div>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy-800 sm:text-[32px]">
          {event.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge status={event.status} />
          <span className="text-ink-400">·</span>
          <span className="text-ink-500">
            {event.stalls.booked}/{event.stalls.available} stalls booked
          </span>
        </div>
      </header>

      {/* Edit form */}
      <form
        onSubmit={onSave}
        className="rounded-3xl border border-black/5 bg-white p-6 shadow-soft sm:p-8"
      >
        <div className="space-y-5">
          <Field label="Event Title" required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={140}
              className={inputClass}
            />
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={2000}
              className={`${inputClass} resize-y`}
            />
          </Field>

          <Field label="Venue Address" required>
            <input
              type="text"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              required
              className={inputClass}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Starts At" required>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Ends At" required>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                required
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Event Photos">
            <MultiImageUploader
              values={coverImageUrls}
              onChange={setCoverImageUrls}
              max={8}
            />
          </Field>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            ⚠ {error}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard/events"
            className="text-sm font-semibold text-ink-500 hover:text-brand-purple"
          >
            Cancel
          </Link>
          <div className="flex flex-wrap gap-2">
            {event.status === 'draft' && (
              <button
                type="button"
                onClick={onSubmit}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-2xl bg-navy-800 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-navy-700 disabled:opacity-50"
              >
                Submit for Review
              </button>
            )}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-2xl bg-purple-gradient px-5 py-3 text-sm font-extrabold text-white ring-1 ring-inset ring-white/15 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>

      {/* Stats card */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-soft">
        <h2 className="text-base font-extrabold text-navy-800">Event Stats</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Stalls Available" value={event.stalls.available.toString()} />
          <Stat label="Stalls Booked" value={event.stalls.booked.toString()} />
          <Stat
            label="Occupancy"
            value={
              event.stalls.available > 0
                ? `${Math.round((event.stalls.booked / event.stalls.available) * 100)}%`
                : '—'
            }
          />
          <Stat
            label="From Price"
            value={
              event.stalls.priceFromPaise
                ? `₹${(event.stalls.priceFromPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                : '—'
            }
          />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-500">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream-100 p-3 text-center">
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{label}</div>
      <div className="mt-1 text-xl font-extrabold tabular-nums text-navy-800">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, string> = {
    draft: 'bg-cream-200 text-ink-500',
    pending_verification: 'bg-amber-100 text-amber-700',
    live: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-rose-100 text-rose-700',
  };
  const label = status === 'pending_verification' ? 'Pending Review' : status;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${m[status] ?? 'bg-cream-200'}`}
    >
      {label}
    </span>
  );
}

const inputClass =
  'w-full rounded-2xl border border-black/10 bg-cream-50 px-4 py-3 text-sm font-medium text-navy-800 outline-none transition focus:border-brand-purple/40 focus:bg-white focus:ring-2 focus:ring-brand-purple/15';

function toLocalInput(iso: string): string {
  // datetime-local needs `YYYY-MM-DDTHH:mm` in the user's local timezone.
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
