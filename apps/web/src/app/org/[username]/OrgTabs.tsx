'use client';

// OrgTabs — client-side tab switcher for the org page.
// Tabs: Upcoming · Past · Reviews. Each tab lazy-loads its data on first view.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  api,
  ApiError,
  type ApiEvent,
  type ApiReview,
  type PublicPost,
  type ReviewsSummary,
} from '@/lib/api';
import { EventCard } from '@/components/EventCard';
import { PostCard } from '@/components/posts/PostCard';

type Tab = 'posts' | 'upcoming' | 'past' | 'reviews';
type EventsCache = { upcoming?: ApiEvent[]; past?: ApiEvent[] };
type ReviewsPayload = {
  items: Array<ApiReview & { event: { slug: string; title: string } }>;
  summary: ReviewsSummary;
};

export function OrgTabs({ username }: { username: string }) {
  const [tab, setTab] = useState<Tab>('posts');
  const [events, setEvents] = useState<EventsCache>({});
  const [reviews, setReviews] = useState<ReviewsPayload | null>(null);
  const [posts, setPosts] = useState<PublicPost[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    if (posts) return;
    setBusy(true);
    setError(null);
    try {
      const page = await api.posts.listForProfile(username);
      setPosts(page.items);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [username, posts]);

  const loadEvents = useCallback(
    async (when: 'upcoming' | 'past') => {
      if (events[when]) return;
      setBusy(true);
      setError(null);
      try {
        const list = await api.org.events(username, when);
        setEvents((prev) => ({ ...prev, [when]: list }));
      } catch (err) {
        setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [username, events],
  );

  const loadReviews = useCallback(async () => {
    if (reviews) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.org.reviews(username);
      setReviews(r);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [username, reviews]);

  // Initial load: posts (default tab)
  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // On tab change, load if needed
  useEffect(() => {
    if (tab === 'posts') loadPosts();
    else if (tab === 'upcoming' || tab === 'past') loadEvents(tab);
    else loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <section className="mt-8">
      <nav
        role="tablist"
        className="mb-6 inline-flex gap-1 rounded-2xl border border-black/5 bg-white p-1 shadow-card"
      >
        {(['posts', 'upcoming', 'past', 'reviews'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              tab === t
                ? 'bg-purple-gradient text-white shadow-purple'
                : 'text-ink-500 hover:bg-cream-200'
            }`}
          >
            {labelOf(t)}
          </button>
        ))}
      </nav>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {tab === 'posts' && <PostsList items={posts} busy={busy} />}
      {tab === 'upcoming' && (
        <EventGrid items={events.upcoming} busy={busy} emptyHint="No upcoming events yet." />
      )}
      {tab === 'past' && (
        <EventGrid items={events.past} busy={busy} emptyHint="No past events yet." />
      )}
      {tab === 'reviews' && <ReviewList payload={reviews} busy={busy} />}
    </section>
  );
}

function labelOf(t: Tab): string {
  if (t === 'posts') return 'Posts';
  if (t === 'upcoming') return 'Upcoming';
  if (t === 'past') return 'Past';
  return 'Reviews';
}

function EventGrid({
  items,
  busy,
  emptyHint,
}: {
  items?: ApiEvent[];
  busy: boolean;
  emptyHint: string;
}) {
  if (!items && busy) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl bg-white shadow-card" />
        ))}
      </div>
    );
  }
  if (!items || items.length === 0) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-brand-purple/40 bg-cream-200 p-8 text-center text-sm text-ink-400">
        {emptyHint}
      </p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((e) => (
        <EventCard key={e.id} event={e} />
      ))}
    </div>
  );
}

function ReviewList({
  payload,
  busy,
}: {
  payload: ReviewsPayload | null;
  busy: boolean;
}) {
  if (!payload && busy) {
    return <div className="h-32 animate-pulse rounded-2xl bg-white shadow-card" />;
  }
  if (!payload) return null;

  const { items, summary } = payload;

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-brand-purple/40 bg-cream-200 p-8 text-center text-sm text-ink-400">
        No reviews yet.
      </p>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-card">
        <div className="text-center sm:text-left">
          <div className="text-3xl font-extrabold text-ink-700">
            {summary.average.toFixed(1)}
          </div>
          <div className="text-xs text-ink-300">
            {summary.count} review{summary.count === 1 ? '' : 's'}
          </div>
        </div>
        <div className="flex-1 text-xs text-ink-400">
          Across all events from this organiser.
        </div>
      </div>

      <ul className="grid gap-3">
        {items.map((r) => (
          <li key={r.id} className="rounded-2xl border border-black/5 bg-white p-4 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-ink-700">{r.author.label}</div>
              <div className="flex gap-0.5 text-amber-500" aria-label={`${r.stars} stars`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} filled={i + 1 <= r.stars} />
                ))}
              </div>
            </div>
            <Link
              href={`/events/${r.event.slug}`}
              className="mt-1 inline-block text-xs font-semibold text-brand-purple hover:underline"
            >
              {r.event.title} ↗
            </Link>
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
    </>
  );
}

function PostsList({ items, busy }: { items: PublicPost[] | null; busy: boolean }) {
  if (!items && busy) {
    return <div className="h-32 animate-pulse rounded-2xl bg-white shadow-card" />;
  }
  if (!items || items.length === 0) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-brand-purple/40 bg-cream-200 p-8 text-center text-sm text-ink-400">
        No posts yet — follow to get updates when they post.
      </p>
    );
  }
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {items.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      width={14}
      height={14}
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
