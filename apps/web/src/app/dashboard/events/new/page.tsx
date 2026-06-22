'use client';

// /dashboard/events/new — 2-step event-creation wizard.
// Page 1: identity & logistics. Page 2: stalls. Submit creates the event
// (draft) and immediately publishes it (auto-approved in dev).

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError, type PublicSociety } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLocation } from '@/lib/use-location';
import { MultiImageUploader } from '@/components/profile/MultiImageUploader';

type Stall = {
  category: string;
  pricePaise: number;
  available: number;
};

const STALL_CATEGORIES = [
  'food',
  'home-decor',
  'fashion',
  'art',
  'books',
  'services',
  'kids',
  'fitness',
] as const;

const DEFAULT_STALL: Stall = { category: 'food', pricePaise: 100000, available: 4 };

// Local date-time inputs format: "yyyy-MM-ddTHH:mm" in local time. We convert
// to ISO 8601 UTC on submit.
function todayPlus(daysAhead: number, hour = 17): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

export default function NewEventPage() {
  const auth = useAuth();
  const router = useRouter();
  const loc = useLocation();

  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [societies, setSocieties] = useState<PublicSociety[]>([]);

  // Page 1 fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [societySlug, setSocietySlug] = useState('');
  const [addressText, setAddressText] = useState('');
  // No demo fallback — user must either grant geolocation or pick a society.
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [startsAt, setStartsAt] = useState(todayPlus(7));
  const [endsAt, setEndsAt] = useState(todayPlus(7, 22));
  const [coverImageUrls, setCoverImageUrls] = useState<string[]>([]);

  // Page 2 fields
  const [capacity, setCapacity] = useState<number | ''>(300);
  const [stalls, setStalls] = useState<Stall[]>([DEFAULT_STALL]);

  // Redirect anonymous users.
  useEffect(() => {
    if (auth.status === 'anonymous') router.replace('/login');
  }, [auth.status, router]);

  // Load societies for the dropdown.
  useEffect(() => {
    api.societies.list().then(setSocieties).catch(() => {});
  }, []);

  // When the user grants location, autofill lat/lng on page 1.
  useEffect(() => {
    if (loc.status === 'granted') {
      setLatitude(loc.lat);
      setLongitude(loc.lng);
    }
  }, [loc.status, loc.lat, loc.lng]);

  // When a society is picked, prefill lat/lng with its centroid.
  function pickSociety(slug: string) {
    setSocietySlug(slug);
    const s = societies.find((x) => x.slug === slug);
    if (s) {
      setLatitude(s.centroidLat);
      setLongitude(s.centroidLng);
    }
  }

  function next(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (new Date(endsAt) <= new Date(startsAt)) {
      setError('End time must be after start time.');
      return;
    }
    if (latitude === null || longitude === null) {
      setError('Set your event location — grant your browser location or pick a society above.');
      return;
    }
    setStep(2);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (latitude === null || longitude === null) {
      setError('Location is required. Go back to step 1 and set it.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const event = await api.events.create({
        title: title.trim(),
        description: description.trim(),
        societySlug: societySlug || undefined,
        addressText: addressText.trim(),
        latitude,
        longitude,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        coverImageUrls: coverImageUrls.length > 0 ? coverImageUrls : undefined,
        capacity: capacity === '' ? undefined : Number(capacity),
        stalls,
      });
      await api.events.submit(event.id);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl py-2 sm:py-4">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-ink-500 transition hover:text-navy-800"
        >
          ← Back to dashboard
        </Link>

        {/* Progress */}
        <div className="mb-6 flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.16em]">
          <span className={step === 1 ? 'text-navy-800' : 'text-ink-300'}>
            <span className={`mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-md ${step === 1 ? 'bg-navy-800 text-white' : 'bg-cream-200 text-ink-400'} text-[10px] tabular-nums`}>1</span>
            Logistics
          </span>
          <div className="h-px flex-1 bg-black/10" />
          <span className={step === 2 ? 'text-navy-800' : 'text-ink-300'}>
            <span className={`mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-md ${step === 2 ? 'bg-navy-800 text-white' : 'bg-cream-200 text-ink-400'} text-[10px] tabular-nums`}>2</span>
            Stalls
          </span>
        </div>

        <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">
          New event
        </div>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy-800 sm:text-[32px]">
          {step === 1 ? 'Tell us about your event' : 'Add stall inventory'}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {step === 1
            ? 'Title, description, location, and timing.'
            : 'How many stalls and at what price? You can add or change these later.'}
        </p>

        {step === 1 && (
          <form onSubmit={next} className="mt-8 space-y-5">
            <Field label="Event title">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={3}
                maxLength={140}
                placeholder="e.g. Sector 76 Diwali Mela"
                className="input"
              />
            </Field>

            <Field label="Description" hint="At least 20 characters. Tell vendors and attendees what's special.">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                minLength={20}
                maxLength={8000}
                rows={5}
                placeholder="What's it about, who's it for, what's the vibe?"
                className="input"
              />
            </Field>

            <Field label="Society (optional)" hint="Search and pick a society to link this event for discovery.">
              <SocietyCombobox
                value={societySlug}
                societies={societies}
                onPick={pickSociety}
              />
            </Field>

            <Field label="Address" hint="The exact street address attendees will see.">
              <input
                type="text"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                required
                minLength={5}
                maxLength={300}
                placeholder="e.g. Central Lawn, Sector 76, Noida"
                className="input"
              />
            </Field>

            <LocationCard
              status={loc.status}
              latitude={latitude}
              longitude={longitude}
              hasSocietyPicked={!!societySlug}
              onRequest={loc.request}
              error={loc.error}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts at">
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  required
                  className="input"
                />
              </Field>
              <Field label="Ends at">
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  required
                  className="input"
                />
              </Field>
            </div>

            <Field
              label="Event photos (optional)"
              hint="Upload up to 8 photos. The first photo is the main cover; the rest show as a gallery on your event page."
            >
              <MultiImageUploader
                values={coverImageUrls}
                onChange={setCoverImageUrls}
                max={8}
              />
            </Field>

            {error && <ErrorBox>{error}</ErrorBox>}

            <button type="submit" className="btn btn-primary w-full">
              Next: stalls →
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={submit} className="mt-8 space-y-5">
            <Field label="Expected capacity (optional)">
              <input
                type="number"
                min={0}
                max={50_000}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 500"
                className="input"
              />
            </Field>

            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="text-sm font-semibold text-ink-600">Stalls</span>
                <button
                  type="button"
                  onClick={() => setStalls([...stalls, { ...DEFAULT_STALL }])}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-bold text-navy-700 transition hover:bg-cream-100"
                >
                  + Add another category
                </button>
              </div>

              {stalls.map((stall, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-black/5 bg-white p-4 shadow-card"
                >
                  <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr_auto]">
                    <select
                      value={stall.category}
                      onChange={(e) => {
                        const next = [...stalls];
                        next[idx] = { ...stall, category: e.target.value };
                        setStalls(next);
                      }}
                      className="input"
                    >
                      {STALL_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <NumberField
                      value={stall.pricePaise / 100}
                      label="₹ price"
                      onChange={(n) => {
                        const next = [...stalls];
                        next[idx] = { ...stall, pricePaise: Math.round(n * 100) };
                        setStalls(next);
                      }}
                    />
                    <NumberField
                      value={stall.available}
                      label="qty"
                      onChange={(n) => {
                        const next = [...stalls];
                        next[idx] = { ...stall, available: Math.max(1, Math.floor(n)) };
                        setStalls(next);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setStalls(stalls.filter((_, i) => i !== idx))}
                      disabled={stalls.length === 1}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Remove stall row"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {error && <ErrorBox>{error}</ErrorBox>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-secondary"
              >
                ← Back
              </button>
              <button type="submit" disabled={busy} className="btn btn-primary flex-1">
                {busy ? 'Publishing…' : 'Publish event'}
              </button>
            </div>
            <p className="text-center text-xs text-ink-300">
              Once submitted, your event enters our verification queue and goes live after approval.
            </p>
          </form>
        )}
      <style>{`.input{
        width:100%;
        border-radius:1rem;
        border:1px solid rgba(0,0,0,.1);
        background:#fff;
        padding:0.75rem 1rem;
        font-size:0.95rem;
        outline:none;
        box-shadow:0 4px 12px rgba(0,0,0,.04);
      }
      .input:focus{
        border-color:#ff6b35;
        box-shadow:0 0 0 3px rgba(255,107,53,.18);
      }`}</style>
    </main>
  );
}

// ============================================================
// SocietyCombobox — searchable typeahead for societies.
// Falls through to "no society" when the input is cleared.
// ============================================================
function SocietyCombobox({
  value,
  societies,
  onPick,
}: {
  value: string;
  societies: PublicSociety[];
  onPick: (slug: string) => void;
}) {
  const selected = societies.find((s) => s.slug === value);
  const [query, setQuery] = useState(selected ? `${selected.name} (${selected.city})` : '');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  // Keep input text in sync if the parent changes the slug (e.g. clear)
  useEffect(() => {
    const next = societies.find((s) => s.slug === value);
    setQuery(next ? `${next.name} (${next.city})` : '');
  }, [value, societies]);

  const filtered = societies.filter((s) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q)
    );
  });

  function commit(slug: string) {
    const s = societies.find((x) => x.slug === slug);
    if (s) {
      setQuery(`${s.name} (${s.city})`);
      onPick(slug);
    } else {
      setQuery('');
      onPick('');
    }
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
          // If user clears the field, reset selection.
          if (!e.target.value) onPick('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, filtered.length));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlight === 0) {
              commit('');
            } else {
              const s = filtered[highlight - 1];
              if (s) commit(s.slug);
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Type to search — e.g. Noida, Sector 76, Faridabad"
        className="input"
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-black/10 bg-white py-1 shadow-card">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => commit('')}
            className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition ${
              highlight === 0 ? 'bg-cream-100 text-navy-800' : 'text-ink-500 hover:bg-cream-100'
            }`}
          >
            <span className="text-base">—</span>
            <span className="italic">No society / not listed</span>
          </button>
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-center text-xs text-ink-400">
              No matches — try a different name or city.
            </div>
          )}
          {filtered.map((s, i) => (
            <button
              type="button"
              key={s.slug}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(s.slug)}
              className={`flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm transition ${
                highlight === i + 1
                  ? 'bg-cream-100 text-navy-800'
                  : 'text-ink-700 hover:bg-cream-100'
              }`}
            >
              <span className="font-semibold">{s.name}</span>
              <span className="text-xs text-ink-400">{s.city}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// LocationCard — single button + status, replacing raw lat/lng inputs.
// ============================================================
function LocationCard({
  status,
  latitude,
  longitude,
  hasSocietyPicked,
  onRequest,
  error,
}: {
  status: 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable';
  latitude: number | null;
  longitude: number | null;
  hasSocietyPicked: boolean;
  onRequest: () => void;
  error?: string | null;
}) {
  const hasCoords = latitude !== null && longitude !== null;
  const granted = status === 'granted' || hasCoords;
  const busy = status === 'loading';
  const showError = !!error && (status === 'denied' || status === 'unavailable');
  const sourceLabel = status === 'granted'
    ? 'From your current location'
    : hasSocietyPicked
      ? 'From the selected society'
      : null;
  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        granted
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-black/10 bg-cream-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            granted ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-purple/10 text-brand-purple'
          }`}
        >
          <PinIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold text-navy-800">
            {granted ? 'Location captured' : 'Set event location'}
          </div>
          <div className="mt-0.5 text-xs text-ink-500">
            {granted && hasCoords ? (
              <span className="tabular-nums">
                {latitude!.toFixed(4)}, {longitude!.toFixed(4)}
                {sourceLabel && (
                  <span className="ml-1.5 text-ink-400">· {sourceLabel}</span>
                )}
              </span>
            ) : busy ? (
              'Asking your browser for permission…'
            ) : (
              'Required — grant your browser location or pick a society above to use its location.'
            )}
          </div>
          {showError && (
            <div className="mt-1 text-xs text-amber-700">⚠ {error}</div>
          )}
        </div>
        <button
          type="button"
          onClick={onRequest}
          disabled={busy}
          className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition disabled:opacity-50 ${
            granted
              ? 'border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-100'
              : 'bg-navy-800 text-white hover:bg-navy-700'
          }`}
        >
          {busy ? 'Locating…' : granted ? 'Re-capture' : 'Use my location'}
        </button>
      </div>
    </div>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 0 1 9.5 9 2.5 2.5 0 0 1 12 6.5 2.5 2.5 0 0 1 14.5 9 2.5 2.5 0 0 1 12 11.5z" />
    </svg>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink-600">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink-300">{hint}</span>}
    </label>
  );
}

function NumberField({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder={label}
        className="input"
      />
    </label>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {children}
    </div>
  );
}
