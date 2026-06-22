'use client';

// /dashboard/feed — Follower feed.
//
// Shows posts from every organiser and stall owner the signed-in user follows,
// ordered newest-first. Cursor-pagination via the Load more button at the
// bottom — we don't auto-scroll-load because users on this app are typically
// reviewing a curated list, not infinite-scrolling.
//
// Empty state nudges the user towards Explore (/dashboard/people) so they have
// a clear path to start following profiles.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type PublicPost } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { PostCard } from '@/components/posts/PostCard';

export default function FeedPage() {
  const auth = useAuth();
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    let alive = true;
    (async () => {
      try {
        const page = await api.posts.feed();
        if (!alive) return;
        setPosts(page.items);
        setCursor(page.nextCursor);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof ApiError ? err.message : (err as Error).message);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [auth.status]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await api.posts.feed(cursor);
      setPosts((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">
          Feed
        </div>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy-800 sm:text-[32px]">
          Latest from people you follow
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Posts from organisers and stall owners you follow, newest first.
        </p>
      </header>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          ⚠ {error}
        </div>
      )}

      {/* Loading skeleton */}
      {!loaded && (
        <div className="mx-auto max-w-2xl space-y-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-white shadow-card"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {loaded && !error && posts.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-brand-purple/30 bg-cream-100 p-10 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-purple/15 text-2xl">
            👥
          </div>
          <h3 className="text-base font-extrabold text-navy-800">
            Your feed is empty
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
            Follow some organisers and stall owners and their latest posts will show up here.
          </p>
          <Link
            href="/dashboard/people"
            className="mt-4 inline-flex rounded-2xl bg-purple-gradient px-5 py-2.5 text-sm font-bold text-white shadow-purple"
          >
            Find profiles to follow →
          </Link>
        </div>
      )}

      {/* Feed list */}
      {loaded && posts.length > 0 && (
        <div className="mx-auto max-w-2xl space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          {cursor && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-5 py-2.5 text-sm font-bold text-navy-700 shadow-soft transition hover:bg-cream-100 disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load more posts'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
