'use client';

// FollowButton — Follow / Following toggle for a business profile.
//
// Renders a polished follower-count pill + Follow CTA combo that matches the
// purple brand. Click "Follow" to follow; if already following, the button
// flips to "Following" (hover reveals "Unfollow").
//
// Behaviour:
//   - Loading: skeleton placeholder.
//   - Anonymous: Follow deep-links to /login (preserving current URL).
//   - Authenticated: Optimistic toggle with rollback on error.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; isFollowing: boolean; followersCount: number }
  | { kind: 'error'; message: string };

function formatCount(n: number): string {
  if (n < 1000) return n.toLocaleString('en-IN');
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export function FollowButton({ username }: { username: string }) {
  const auth = useAuth();
  const pathname = usePathname();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [hoverFollowing, setHoverFollowing] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await api.profiles.byUsername(username);
        if (!alive) return;
        setState({
          kind: 'ready',
          isFollowing: !!p.isFollowing,
          followersCount: p.followersCount,
        });
      } catch (err) {
        if (!alive) return;
        setState({
          kind: 'error',
          message:
            err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message,
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [username, auth.status]);

  async function toggle() {
    if (state.kind !== 'ready' || busy) return;
    setBusy(true);
    const wasFollowing = state.isFollowing;
    // Optimistic
    setState({
      kind: 'ready',
      isFollowing: !wasFollowing,
      followersCount: Math.max(0, state.followersCount + (wasFollowing ? -1 : 1)),
    });
    try {
      const res = wasFollowing
        ? await api.follow.unfollow(username)
        : await api.follow.follow(username);
      setState({
        kind: 'ready',
        isFollowing: res.isFollowing,
        followersCount: res.followersCount,
      });
    } catch (err) {
      // Rollback.
      setState({
        kind: 'ready',
        isFollowing: wasFollowing,
        followersCount: state.followersCount,
      });
      // eslint-disable-next-line no-console
      console.error('follow toggle failed', err);
    } finally {
      setBusy(false);
    }
  }

  // ============= LOADING SKELETON =============
  if (state.kind === 'loading' || auth.status === 'loading') {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="h-11 w-32 animate-pulse rounded-2xl bg-cream-200" />
        <span className="h-11 w-28 animate-pulse rounded-2xl bg-cream-200" />
      </div>
    );
  }

  if (state.kind === 'error') return null;

  const followersCountLabel = formatCount(state.followersCount);
  const followersWord = state.followersCount === 1 ? 'Follower' : 'Followers';

  // ============= ANONYMOUS =============
  if (auth.status === 'anonymous') {
    return (
      <div className="inline-flex items-center gap-2">
        <FollowerPill count={followersCountLabel} word={followersWord} />
        <Link
          href={`/login?next=${encodeURIComponent(pathname || '/')}`}
          className="inline-flex h-11 items-center gap-1.5 rounded-2xl bg-purple-gradient px-5 text-sm font-bold text-white shadow-purple transition hover:brightness-110"
        >
          <PlusIcon className="h-4 w-4" />
          Follow
        </Link>
      </div>
    );
  }

  // ============= AUTHENTICATED =============
  return (
    <div className="inline-flex items-center gap-2">
      <FollowerPill count={followersCountLabel} word={followersWord} />
      {state.isFollowing ? (
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          onMouseEnter={() => setHoverFollowing(true)}
          onMouseLeave={() => setHoverFollowing(false)}
          className={`inline-flex h-11 items-center gap-1.5 rounded-2xl border px-5 text-sm font-bold transition disabled:opacity-60 ${
            hoverFollowing
              ? 'border-rose-200 bg-rose-50 text-rose-600'
              : 'border-black/10 bg-white text-navy-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
          }`}
        >
          {hoverFollowing ? (
            <>
              <CloseIcon className="h-3.5 w-3.5" />
              Unfollow
            </>
          ) : (
            <>
              <CheckIcon className="h-4 w-4 text-emerald-500" />
              Following
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className="inline-flex h-11 items-center gap-1.5 rounded-2xl bg-purple-gradient px-5 text-sm font-bold text-white shadow-purple transition hover:brightness-110 disabled:opacity-60"
        >
          <PlusIcon className="h-4 w-4" />
          Follow
        </button>
      )}
    </div>
  );
}

// ============================================================
// FollowerPill — clean count + label chip
// ============================================================
function FollowerPill({ count, word }: { count: string; word: string }) {
  return (
    <div className="inline-flex h-11 items-center gap-2 rounded-2xl border border-black/[0.08] bg-white px-4 shadow-soft">
      <UserGroupIcon className="h-4 w-4 text-brand-purple" />
      <span className="text-sm font-extrabold tabular-nums text-navy-800">
        {count}
      </span>
      <span className="text-xs font-semibold text-ink-500">{word}</span>
    </div>
  );
}

// ============================================================
// Icons
// ============================================================
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={className}>
      <path d="M5 12l5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
function UserGroupIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M17 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
