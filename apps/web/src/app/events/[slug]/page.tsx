// /events/[slug] — public event detail page. Server-rendered for SEO.
// Vendor "Apply for a stall" interaction is handled by ApplyStallButton.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, type ApiEvent } from '@/lib/api';
import { ReviewSection } from './ReviewSection';
import { FollowButton } from './FollowButton';
import { EventGallery } from './EventGallery';
import { ApplyStallButton } from './ApplyStallButton';
import { Recommendations } from './Recommendations';
import { EventMap } from '@/components/EventMap';
import { LifecycleBadge } from '@/components/LifecycleBadge';
import { getEventLifecycle } from '@/lib/event-lifecycle';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  try {
    const event = await api.eventBySlug(slug);
    return {
      title: event.title,
      description: event.description.slice(0, 200),
      openGraph: {
        title: event.title,
        description: event.description.slice(0, 200),
        images: event.coverImages.length ? [event.coverImages[0]] : undefined,
      },
    };
  } catch {
    return { title: 'Event' };
  }
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

export default async function EventDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  let event: ApiEvent;
  try {
    event = await api.eventBySlug(slug);
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/dashboard/explore"
          className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-purple hover:underline"
        >
          ← Back to events
        </Link>

        {/* Image gallery — hero + thumbnail strip when multiple covers exist. */}
        <EventGallery images={event.coverImages ?? []} alt={event.title} />

        {/* Single-column layout. The previous right-rail "Book a stall" panel
            was removed — direct stall booking is deferred in favour of the
            Apply Stall flow handled by the ApplyStallButton above. */}
        <div className="mx-auto max-w-3xl">
          <div>
            {(() => {
              const lifecycle = getEventLifecycle(event);
              return (
                <>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <LifecycleBadge badge={lifecycle.badge} size="lg" />
                    {lifecycle.warning && (
                      <LifecycleBadge badge={lifecycle.warning} size="lg" />
                    )}
                    {lifecycle.isTrending && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-orange-500 to-rose-500 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-white shadow-soft">
                        🔥 Trending
                      </span>
                    )}
                    {event.organiser.verified && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        ✓ Verified organiser
                      </span>
                    )}
                    {event.society && (
                      <span className="rounded-full bg-cream-200 px-2.5 py-1 text-xs font-bold text-ribbon-purple">
                        📍 {event.society.name}
                      </span>
                    )}
                  </div>

                  <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-navy-800 sm:text-5xl">
                    {event.title}
                  </h1>

                  <p className="mt-3 text-base text-ink-400 sm:text-lg">
                    <strong className="text-navy-800">{formatDate(event.startsAt)}</strong>{' '}
                    →{' '}
                    {formatDate(event.endsAt)}
                  </p>
                  {lifecycle.countdown && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-ribbon-purple/10 px-3 py-1 text-sm font-bold text-ribbon-purple">
                      ⏱ {lifecycle.countdown}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-ink-400">📍 {event.addressText}</p>
                  <p className="mt-1 text-sm text-ink-400">
                    By{' '}
                    <Link
                      href={`/org/${event.organiser.username}`}
                      className="font-bold text-ribbon-purple hover:underline"
                    >
                      @{event.organiser.username}
                    </Link>{' '}
                    · ⭐ {event.organiser.avgRating.toFixed(2)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <FollowButton username={event.organiser.username} />
                    <ApplyStallButton
                      eventSlug={event.slug}
                      eventTitle={event.title}
                      accepting={lifecycle.acceptsBookings}
                    />
                  </div>
                </>
              );
            })()}

            <h2 className="mt-8 text-lg font-bold text-ink-700">About this event</h2>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed text-ink-400">
              {event.description}
            </p>

            {/* Mini-map — OpenStreetMap tiles via Leaflet (zero cost) */}
            {typeof event.latitude === 'number' && typeof event.longitude === 'number' && (
              <section className="mt-8">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-ink-700">Location</h2>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${event.latitude}&mlon=${event.longitude}#map=17/${event.latitude}/${event.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-brand-orange hover:underline"
                  >
                    Open in maps ↗
                  </a>
                </div>
                <EventMap
                  latitude={event.latitude}
                  longitude={event.longitude}
                  label={event.title}
                />
                <p className="mt-2 text-xs text-ink-400">📍 {event.addressText}</p>
              </section>
            )}

            {event.capacity && (
              <p className="mt-5 text-sm text-ink-400">
                Expected capacity: <strong className="text-ink-700">{event.capacity}</strong>
              </p>
            )}
          </div>

        </div>

        <ReviewSection eventSlug={event.slug} />
        <Recommendations slug={event.slug} />
    </main>
  );
}
