'use client';

import { useEffect, useState } from 'react';
import { api, type ApiEvent } from '@/lib/api';
import { EventCard } from '@/components/EventCard';

export function Recommendations({ slug }: { slug: string }) {
  const [items, setItems] = useState<ApiEvent[] | null>(null);
  useEffect(() => {
    api
      .recommendations(slug)
      .then(setItems)
      .catch(() => setItems([]));
  }, [slug]);

  if (!items || items.length === 0) return null;
  return (
    <section className="mt-12 border-t border-black/5 pt-10">
      <h2 className="text-2xl font-bold text-ink-700 sm:text-3xl">You may also like</h2>
      <p className="mt-1 text-sm text-ink-300">Based on what other attendees booked.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </section>
  );
}
