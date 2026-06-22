'use client';

// /dashboard/posts — Organiser + vendor posts hub.
//
// Layout:
//   • Tight header with eyebrow + title + helper line.
//   • PostComposer card (purple-branded; matches the rest of the dashboard).
//   • Section divider with a "Your posts" label and a "View public profile" link.
//   • Chronological list of THIS user's own posts via PostCard, OR an
//     empty-state card prompting them to publish their first update.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  api,
  ApiError,
  type PublicBusinessProfile,
  type PublicPost,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { PostCard } from '@/components/posts/PostCard';
import { PostComposer } from '@/components/posts/PostComposer';

export default function PostsPage() {
  const auth = useAuth();
  const [profile, setProfile] = useState<PublicBusinessProfile | null>(null);
  const [posts, setPosts] = useState<PublicPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missingProfile, setMissingProfile] = useState(false);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    let alive = true;
    (async () => {
      try {
        const profiles = await api.profiles.mine();
        if (!alive) return;
        const own = profiles[0];
        if (!own) {
          setMissingProfile(true);
          return;
        }
        setProfile(own);
        const page = await api.posts.listForProfile(own.username);
        if (!alive) return;
        setPosts(page.items);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof ApiError ? err.message : (err as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [auth.status]);

  function handlePublished(newPost: PublicPost) {
    setPosts((prev) => (prev ? [newPost, ...prev] : [newPost]));
  }

  if (auth.status === 'loading') return <SkeletonPage />;

  if (missingProfile) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader />
        <EmptyCard
          icon="✍️"
          title="Create your profile first"
          body="You need an organiser or stall-owner profile before you can publish posts."
          cta={{ href: '/dashboard/profile', label: 'Set up profile' }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader />

      {/* Composer */}
      {profile && <PostComposer profile={profile} onPublish={handlePublished} />}

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          ⚠ {error}
        </div>
      )}

      {/* Section divider */}
      <div className="flex items-center justify-between border-b border-black/[0.06] pb-2">
        <h2 className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-500">
          Your posts
          {posts && posts.length > 0 && (
            <span className="rounded-full bg-brand-purple/10 px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-brand-purple">
              {posts.length}
            </span>
          )}
        </h2>
        {profile && (
          <Link
            href={`/org/${encodeURIComponent(profile.username)}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-brand-purple hover:underline"
          >
            View public profile
            <ArrowRightIcon className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Posts list */}
      {posts === null ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-white shadow-card"
            />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyCard
          icon="📝"
          title="No posts yet"
          body="Your first post will be visible on your public profile and in your followers' feeds."
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              canDelete
              onChange={(next) => {
                // next === null means the post was deleted; drop it from the
                // local list so the UI reflects the change without a refetch.
                setPosts((prev) =>
                  (prev ?? []).flatMap((p) =>
                    p.id === post.id ? (next ? [next] : []) : [p],
                  ),
                );
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Header
// ============================================================
function PageHeader() {
  return (
    <header>
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">
        Posts
      </div>
      <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy-800 sm:text-[32px]">
        Share an update
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Posts appear on your public profile and in the feed of anyone who follows you.
      </p>
    </header>
  );
}

// ============================================================
// Empty / setup card
// ============================================================
function EmptyCard({
  icon,
  title,
  body,
  cta,
}: {
  icon: string;
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-brand-purple/30 bg-white p-10 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-purple/10 text-2xl">
        {icon}
      </div>
      <h3 className="text-base font-extrabold text-navy-800">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-purple-gradient px-5 py-2.5 text-sm font-bold text-white shadow-purple"
        >
          {cta.label}
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

// ============================================================
// Skeleton
// ============================================================
function SkeletonPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="space-y-2">
        <div className="h-3 w-16 animate-pulse rounded bg-cream-200" />
        <div className="h-8 w-72 animate-pulse rounded bg-cream-200" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-cream-200" />
      </div>
      <div className="h-44 animate-pulse rounded-3xl bg-white shadow-card" />
      <div className="h-32 animate-pulse rounded-2xl bg-white shadow-card" />
    </div>
  );
}

// ============================================================
// Icons
// ============================================================
function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
