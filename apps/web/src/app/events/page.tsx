// /events — Step 4 geo-aware feed.
// Server-renders an initial date-sorted list (no location), then the client
// shell upgrades to /discover when the user grants geolocation.

import Link from 'next/link';
import { api, type ApiEvent } from '@/lib/api';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { EventsClient } from './EventsClient';

export const metadata = {
  title: 'Events Near You',
  description: 'Live events seeded in the local database — Step 4 geo-aware feed.',
};

async function fetchInitial(searchTerm: string | undefined): Promise<{
  apiOk: boolean;
  apiMessage: string;
  events: ApiEvent[];
}> {
  try {
    const [health, list] = await Promise.all([
      api.health(),
      api.listEvents({ limit: 12, q: searchTerm }),
    ]);
    return {
      apiOk: health.status === 'ok',
      apiMessage: `API status: ${health.status} · ${list.items.length} live events`,
      events: list.items,
    };
  } catch (err) {
    return {
      apiOk: false,
      apiMessage: `API not reachable: ${(err as Error).message}`,
      events: [],
    };
  }
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const initialQuery = typeof params.q === 'string' ? params.q.trim() : '';
  const initial = await fetchInitial(initialQuery || undefined);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-orange hover:underline"
        >
          ← Back to home
        </Link>

        {/* Hero */}
        <header className="mb-8">
          <div className="mb-3 text-xs font-extrabold uppercase tracking-[0.25em] text-brand-orange">
            Demo · Step 4 · Geo-aware feed
          </div>
          <h1 className="bg-brand-gradient-text bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-6xl">
            Events Near You
          </h1>
          <p className="mt-4 max-w-2xl text-base text-ink-400 sm:text-lg">
            Tap <strong>Use my location</strong> below — we&apos;ll re-rank events by distance using
            PostGIS{' '}
            <code className="rounded bg-cream-200 px-1.5 py-0.5 font-mono text-sm text-brand-orange-dark">
              ST_DWithin
            </code>{' '}
            and a composite score (distance · rating · date).
          </p>
        </header>

        {/* Client-side: location prompt + geo-aware reload */}
        <EventsClient
          initialEvents={initial.events}
          initialApiOk={initial.apiOk}
          initialApiMessage={initial.apiMessage}
          initialQuery={initialQuery}
        />
      </main>
      <Footer />
    </>
  );
}
