'use client';

// PostCard — Facebook-style post card with avatar header, content, image grid,
// like + comment + share actions, and inline comment thread.

import Link from 'next/link';
import { useState } from 'react';
import { api, ApiError, type PublicComment, type PublicPost } from '@/lib/api';

export function PostCard({
  post,
  onChange,
  canDelete = false,
}: {
  post: PublicPost;
  onChange?: (next: PublicPost | null) => void;
  canDelete?: boolean;
}) {
  const [liked, setLiked] = useState(post.liked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<PublicComment[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleLike() {
    // Optimistic flip
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount((c) => Math.max(0, c + (wasLiked ? -1 : 1)));
    try {
      const result = await api.posts.like(post.id);
      setLiked(result.liked);
      setLikesCount(result.likesCount);
    } catch (err) {
      // Roll back on failure
      setLiked(wasLiked);
      setLikesCount((c) => Math.max(0, c + (wasLiked ? 1 : -1)));
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    }
  }

  async function openComments() {
    const next = !open;
    setOpen(next);
    if (next && comments === null) {
      setLoadingComments(true);
      try {
        const list = await api.posts.listComments(post.id);
        setComments(list);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : (err as Error).message);
      } finally {
        setLoadingComments(false);
      }
    }
  }

  async function submitComment() {
    if (!commentText.trim() || posting) return;
    setPosting(true);
    setError(null);
    try {
      const newComment = await api.posts.addComment(post.id, commentText.trim());
      setComments((prev) => (prev ? [newComment, ...prev] : [newComment]));
      setCommentsCount((c) => c + 1);
      setCommentText('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setPosting(false);
    }
  }

  async function share() {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/org/${post.profile.username}`;
    try {
      // @ts-expect-error Web Share API not in lib types
      if (navigator.share) {
        // @ts-expect-error Web Share API not in lib types
        await navigator.share({ title: post.profile.displayName, text: post.content, url });
        return;
      }
    } catch {
      // user cancelled — fall through
    }
    try {
      await navigator.clipboard.writeText(url);
      setError('Link copied');
      setTimeout(() => setError(null), 1500);
    } catch {
      // no-op
    }
  }

  async function remove() {
    if (!canDelete) return;
    if (typeof window !== 'undefined' && !window.confirm('Delete this post?')) return;
    try {
      await api.posts.remove(post.id);
      onChange?.(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    }
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-soft">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-5">
        <Link href={`/org/${post.profile.username}`} className="shrink-0">
          {post.profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.profile.avatarUrl}
              alt={post.profile.displayName}
              className="h-11 w-11 rounded-full object-cover ring-2 ring-white"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-gradient text-sm font-extrabold text-white ring-2 ring-white shadow-purple">
              {initials(post.profile.displayName)}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/org/${post.profile.username}`}
              className="truncate text-sm font-extrabold text-navy-800 hover:underline"
            >
              {post.profile.displayName}
            </Link>
            {post.profile.verified && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700">
                ✓
              </span>
            )}
          </div>
          <div className="text-[11px] text-ink-400">
            @{post.profile.username} · {timeAgo(post.createdAt)}
          </div>
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={remove}
            className="rounded-lg p-2 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
            aria-label="Delete post"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </header>

      {/* Content */}
      <div className="px-5 pt-3">
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-navy-800">
          {post.content}
        </p>
      </div>

      {/* Media grid */}
      {post.mediaUrls.length > 0 && (
        <div
          className={`mt-3 grid gap-1 px-5 ${
            post.mediaUrls.length === 1
              ? 'grid-cols-1'
              : post.mediaUrls.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-2'
          }`}
        >
          {post.mediaUrls.slice(0, 4).map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt=""
              className={`w-full rounded-xl object-cover ${
                post.mediaUrls.length === 1 ? 'aspect-video' : 'aspect-square'
              }`}
            />
          ))}
        </div>
      )}

      {/* Counts strip — always rendered so the comment count is visible even
          when no likes have happened yet. */}
      <div className="mt-3 flex items-center justify-between px-5 text-xs text-ink-500">
        {likesCount > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 shadow-sm ring-2 ring-white">
              <HeartIcon filled className="h-2.5 w-2.5 text-white" />
            </span>
            <span className="font-semibold tabular-nums text-navy-700">{likesCount}</span>
          </span>
        ) : (
          <span className="text-ink-300">Be the first to like</span>
        )}
        <button
          type="button"
          onClick={openComments}
          className="font-semibold tabular-nums text-ink-500 hover:text-brand-purple hover:underline"
        >
          {commentsCount} comment{commentsCount === 1 ? '' : 's'}
        </button>
      </div>

      {/* Action bar */}
      <div className="mt-3 grid grid-cols-3 border-t border-black/5">
        <ActionButton
          onClick={toggleLike}
          active={liked}
          activeColor="text-rose-500"
          label={liked ? 'Liked' : 'Like'}
          icon={<HeartIcon filled={liked} className="h-4 w-4" />}
        />
        <ActionButton
          onClick={openComments}
          active={open}
          activeColor="text-brand-purple"
          label="Comment"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M21 12a8 8 0 0 1-11.7 7.07L4 21l1.9-4.3A8 8 0 1 1 21 12z" strokeLinejoin="round" />
            </svg>
          }
        />
        <ActionButton
          onClick={share}
          active={false}
          label="Share"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 6l-4-4-4 4M12 2v14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      </div>

      {/* Comments thread */}
      {open && (
        <div className="border-t border-black/5 bg-cream-50 px-5 py-4">
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitComment();
                }
              }}
              placeholder="Write a comment…"
              className="flex-1 rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-navy-800 outline-none focus:border-brand-purple/40 focus:ring-2 focus:ring-brand-purple/15"
            />
            <button
              type="button"
              onClick={submitComment}
              disabled={posting || !commentText.trim()}
              className="rounded-full bg-purple-gradient px-4 py-2 text-xs font-extrabold text-white shadow-purple transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {posting ? '…' : 'Post'}
            </button>
          </div>

          {loadingComments && (
            <div className="text-center text-xs text-ink-400">Loading…</div>
          )}

          {!loadingComments && comments && comments.length === 0 && (
            <div className="py-3 text-center text-xs text-ink-400">
              Be the first to comment.
            </div>
          )}

          <ul className="space-y-2">
            {(comments ?? []).map((c) => (
              <li key={c.id} className="flex gap-2">
                {c.user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.user.avatarUrl}
                    alt={c.user.displayName ?? ''}
                    className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-gradient text-[10px] font-extrabold text-white ring-2 ring-white">
                    {initials(c.user.displayName || 'JE')}
                  </div>
                )}
                <div className="rounded-2xl bg-white px-3 py-2 text-sm">
                  <div className="text-[11px] font-bold text-navy-800">
                    {c.user.displayName || 'Anonymous'}
                  </div>
                  <div className="text-navy-800">{c.content}</div>
                  <div className="mt-0.5 text-[10px] text-ink-400">
                    {timeAgo(c.createdAt)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="border-t border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-800">
          {error}
        </div>
      )}
    </article>
  );
}

function ActionButton({
  onClick,
  active,
  label,
  icon,
  activeColor = 'text-brand-purple',
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  icon: React.ReactNode;
  /** Tailwind text-* color class applied when `active` is true. */
  activeColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 py-3 text-sm font-bold transition hover:bg-cream-50 ${
        active ? activeColor : 'text-ink-500'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// HeartIcon — solid when `filled`, outline otherwise. Inherits color from
// the parent button (text-rose-500 when liked, text-ink-500 otherwise).
function HeartIcon({
  filled,
  className,
}: {
  filled?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

function timeAgo(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}
