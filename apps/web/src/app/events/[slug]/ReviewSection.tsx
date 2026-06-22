'use client';

// ReviewSection — client island under the event detail page.
//
// Shape:
//   ┌──────────────────────────────────────┐
//   │  Average + Bayesian + histogram     │
//   │  Leave a review (form OR sign-in)    │
//   │  Review list (newest first)          │
//   └──────────────────────────────────────┘

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  api,
  ApiError,
  type ApiReview,
  type ReviewsListResponse,
  type ReviewsSummary,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export function ReviewSection({ eventSlug }: { eventSlug: string }) {
  const auth = useAuth();
  const [data, setData] = useState<ReviewsListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // form state
  const [stars, setStars] = useState(0);
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const refresh = async () => {
    try {
      const res = await api.reviews.list(eventSlug, { limit: 10 });
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSlug]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (stars < 1 || stars > 5) {
      setFormError('Pick a star rating.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.reviews.create(eventSlug, {
        stars,
        body: body.trim() || undefined,
      });
      setSubmitted(true);
      setStars(0);
      setBody('');
      // Optimistic patch — also refetch to make sure we're in sync.
      setData((d) =>
        d
          ? {
              ...d,
              summary: res.summary,
              items: [res.review, ...d.items],
            }
          : { summary: res.summary, items: [res.review], nextCursor: null },
      );
    } catch (err) {
      const code = err instanceof ApiError ? err.code : '';
      if (code === 'already_reviewed') {
        setFormError("You already reviewed this event.");
      } else {
        setFormError(err instanceof ApiError ? err.message : (err as Error).message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12 border-t border-black/5 pt-10">
      <h2 className="text-2xl font-bold text-ink-700 sm:text-3xl">Reviews</h2>

      {!data && !error && (
        <div className="mt-4 h-24 animate-pulse rounded-2xl bg-white shadow-card" />
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {data && (
        <>
          <Summary summary={data.summary} />
          <ReviewForm
            authStatus={auth.status}
            stars={stars}
            setStars={setStars}
            body={body}
            setBody={setBody}
            busy={busy}
            onSubmit={onSubmit}
            error={formError}
            submitted={submitted}
          />
          <ReviewList items={data.items} />
        </>
      )}
    </section>
  );
}

function Summary({ summary }: { summary: ReviewsSummary }) {
  if (summary.count === 0) {
    return (
      <p className="mt-3 text-ink-400">
        No reviews yet. Be the first to share your experience.
      </p>
    );
  }
  const total = summary.count;

  return (
    <div className="mt-5 grid gap-6 sm:grid-cols-[auto_1fr]">
      <div className="rounded-3xl border border-black/5 bg-white p-5 text-center shadow-card sm:min-w-[160px]">
        <div className="text-5xl font-extrabold leading-none text-ink-700">
          {summary.average.toFixed(1)}
        </div>
        <div className="mt-2 flex justify-center gap-0.5 text-amber-500">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} filled={i + 1 <= Math.round(summary.average)} />
          ))}
        </div>
        <div className="mt-2 text-xs text-ink-300">
          {summary.count} review{summary.count === 1 ? '' : 's'}
        </div>
      </div>

      <ul className="grid gap-1.5 self-center">
        {([5, 4, 3, 2, 1] as const).map((s) => {
          const c = summary.histogram[s];
          const pct = total === 0 ? 0 : Math.round((c / total) * 100);
          return (
            <li key={s} className="flex items-center gap-2 text-xs text-ink-400">
              <span className="w-4 font-semibold">{s}★</span>
              <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-cream-200">
                <span
                  className="absolute inset-y-0 left-0 bg-brand-orange"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="w-8 text-right tabular-nums">{c}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReviewForm({
  authStatus,
  stars,
  setStars,
  body,
  setBody,
  busy,
  onSubmit,
  error,
  submitted,
}: {
  authStatus: 'loading' | 'anonymous' | 'authenticated';
  stars: number;
  setStars: (n: number) => void;
  body: string;
  setBody: (s: string) => void;
  busy: boolean;
  onSubmit: (e: FormEvent) => void;
  error: string | null;
  submitted: boolean;
}) {
  if (authStatus === 'loading') {
    return <div className="mt-8 h-32 animate-pulse rounded-2xl bg-white shadow-card" />;
  }

  if (authStatus === 'anonymous') {
    return (
      <div className="mt-8 rounded-2xl border border-black/5 bg-cream-warm p-5 text-center">
        <p className="text-sm text-ink-400">Sign in to leave a review.</p>
        <Link href="/login" className="btn btn-primary mt-3 inline-flex">
          Sign in
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mt-8 rounded-2xl border border-emerald-300/40 bg-emerald-50 p-5 text-sm text-emerald-700">
        ✅ Thanks for your review.
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 rounded-2xl border border-black/5 bg-white p-5 shadow-card"
    >
      <h3 className="text-base font-bold text-ink-700">Leave a review</h3>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStars(n)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className="text-3xl transition hover:scale-110"
          >
            <Star filled={n <= stars} size={28} />
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="What did you love (or not)? Optional."
        className="mt-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
      />
      {error && (
        <div className="mt-3 rounded-xl border border-rose-300/40 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={busy || stars === 0}
        className="btn btn-primary mt-3 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  );
}

function ReviewList({ items }: { items: ApiReview[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-8 grid gap-3">
      {items.map((r) => (
        <li key={r.id} className="rounded-2xl border border-black/5 bg-white p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-ink-700">{r.author.label}</div>
            <div className="flex gap-0.5 text-amber-500" aria-label={`${r.stars} stars`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} filled={i + 1 <= r.stars} size={14} />
              ))}
            </div>
          </div>
          {r.body && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-400">
              {r.body}
            </p>
          )}
          <div className="mt-2 text-xs text-ink-300">
            {new Date(r.createdAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Star({ filled, size = 18 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M10 1.5l2.6 5.4 5.9.9-4.3 4.2 1 5.9L10 15l-5.3 2.8 1-5.9L1.5 7.8l5.9-.9L10 1.5z" />
    </svg>
  );
}
