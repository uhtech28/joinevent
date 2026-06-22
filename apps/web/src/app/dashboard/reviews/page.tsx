'use client';

// /dashboard/reviews — real reviews aggregated for the signed-in organiser.
// Uses /business-profiles/:username/reviews — no synthesized data.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type ApiReview, type ReviewsSummary } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type EventReview = ApiReview & { event: { slug: string; title: string } };

type PerEventSummary = {
  eventSlug: string;
  eventTitle: string;
  count: number;
  avgRating: number;
};

export default function ReviewsPage() {
  const auth = useAuth();
  const [items, setItems] = useState<EventReview[]>([]);
  const [summary, setSummary] = useState<ReviewsSummary | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    (async () => {
      try {
        const profiles = await api.profiles.mine();
        const org = profiles.find((p) => p.type === 'organiser');
        if (!org) {
          setHasProfile(false);
          setLoaded(true);
          return;
        }
        setHasProfile(true);
        const res = await api.org.reviews(org.username);
        setItems(res.items);
        setSummary(res.summary);
      } catch {
        // surface as empty
      } finally {
        setLoaded(true);
      }
    })();
  }, [auth.status]);

  if (!loaded) {
    return (
      <div className="space-y-4">
        <div className="h-12 w-64 animate-pulse rounded-xl bg-white shadow-soft" />
        <div className="h-32 animate-pulse rounded-3xl bg-white shadow-soft" />
        <div className="h-32 animate-pulse rounded-3xl bg-white shadow-soft" />
      </div>
    );
  }

  if (hasProfile === false) {
    return (
      <div className="mx-auto max-w-xl">
        <header className="mb-6">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-ribbon-yellow">
            Reviews
          </div>
          <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy-800">
            What people are saying
          </h1>
        </header>
        <div className="rounded-3xl border-2 border-dashed border-brand-purple/30 bg-cream-100 p-10 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-purple/15 text-2xl">
            🎤
          </div>
          <h3 className="text-base font-extrabold text-navy-800">Create an organiser profile</h3>
          <p className="mt-1 text-sm text-ink-500">
            Reviews appear here once you publish events and attendees rate them.
          </p>
          <Link href="/dashboard/profile" className="btn btn-primary mt-4 inline-block">
            Set up profile
          </Link>
        </div>
      </div>
    );
  }

  const totalReviews = summary?.count ?? 0;
  const avgRating = summary?.average ?? 0;

  // Group reviews by event for the per-event panel
  const byEvent = new Map<string, PerEventSummary>();
  for (const r of items) {
    const key = r.event.slug;
    const existing = byEvent.get(key);
    if (existing) {
      existing.count += 1;
      existing.avgRating =
        (existing.avgRating * (existing.count - 1) + r.stars) / existing.count;
    } else {
      byEvent.set(key, {
        eventSlug: r.event.slug,
        eventTitle: r.event.title,
        count: 1,
        avgRating: r.stars,
      });
    }
  }
  const summaries = Array.from(byEvent.values()).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-ribbon-yellow">
          Reviews
        </div>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy-800 sm:text-[32px]">
          What people are saying
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Real reviews from vendors and attendees, aggregated across all your events.
        </p>
      </header>

      {/* Summary tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryTile
          tint="bg-ribbon-yellow/30 text-amber-600"
          icon="⭐"
          label="Average Rating"
          value={avgRating > 0 ? avgRating.toFixed(2) : '—'}
          caption={totalReviews === 0 ? 'No ratings yet' : `Across ${totalReviews} review${totalReviews === 1 ? '' : 's'}`}
        />
        <SummaryTile
          tint="bg-emerald-100 text-emerald-600"
          icon="💬"
          label="Total Reviews"
          value={totalReviews.toString()}
          caption={totalReviews > 0 ? 'On your events' : 'Nothing reviewed yet'}
        />
        <SummaryTile
          tint="bg-ribbon-purple/15 text-ribbon-purple"
          icon="🏷"
          label="Events with reviews"
          value={summaries.length.toString()}
          caption={summaries.length > 0 ? 'of your published events' : 'Publish to earn reviews'}
        />
      </div>

      {/* Per-event review list */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-navy-800">Reviews by Event</h2>
          <Link href="/dashboard/events" className="text-xs font-bold text-brand-purple hover:underline">
            View all events
          </Link>
        </div>

        {summaries.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3">
            {summaries.map((s) => (
              <article
                key={s.eventSlug}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-soft"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ribbon-yellow/40 via-amber-200/30 to-brand-purple/30 text-xl">
                  🎪
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-bold text-navy-800">{s.eventTitle}</h3>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-ink-400">
                    <Stars rating={s.avgRating} />
                    <span>
                      {s.count} review{s.count === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/events/${s.eventSlug}#reviews`}
                  className="rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-bold text-navy-700 transition hover:bg-cream-100"
                >
                  Read reviews →
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Latest individual reviews */}
      {items.length > 0 && (
        <section>
          <h2 className="mb-4 text-base font-extrabold text-navy-800">Latest reviews</h2>
          <ul className="grid gap-3">
            {items.slice(0, 8).map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-black/5 bg-white p-4 shadow-soft"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-ink-700">{r.author.label}</div>
                  <Stars rating={r.stars} />
                </div>
                <Link
                  href={`/events/${r.event.slug}`}
                  className="mt-1 inline-block text-xs font-semibold text-brand-purple hover:underline"
                >
                  {r.event.title} ↗
                </Link>
                {r.body && (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-500">
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
        </section>
      )}
    </div>
  );
}

function SummaryTile({
  tint,
  icon,
  label,
  value,
  caption,
}: {
  tint: string;
  icon: string;
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-soft">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-[20px] ${tint}`}>
        {icon}
      </div>
      <div className="mt-3 text-sm font-medium text-ink-500">{label}</div>
      <div className="mt-1 text-[26px] font-extrabold leading-none tabular-nums text-navy-800">
        {value}
      </div>
      <div className="mt-1 text-xs text-ink-400">{caption}</div>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(rating) ? 'text-amber-500' : 'text-cream-300'}>
          ★
        </span>
      ))}
      <span className="ml-1 font-bold text-navy-800">{rating > 0 ? rating.toFixed(1) : '—'}</span>
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border-2 border-dashed border-ribbon-yellow/40 bg-cream-100 p-10 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-ribbon-yellow/30 text-3xl">
        ⭐
      </div>
      <h3 className="text-xl font-extrabold text-navy-800">No reviews yet</h3>
      <p className="mt-2 text-sm text-ink-500">
        Reviews appear here after vendors attend your events and rate their experience.
      </p>
      <Link href="/dashboard/events" className="btn btn-primary mt-5 inline-block">
        Manage events
      </Link>
    </div>
  );
}
