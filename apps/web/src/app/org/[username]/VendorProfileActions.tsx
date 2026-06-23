'use client';

// VendorProfileActions — the two big buttons that sit above the About Us
// section on a stall-owner profile.
//
// • View Followers  — opens a modal listing followers by name + avatar.
//                     Visible to everyone (including anonymous viewers).
// • View Enquiries  — only rendered when the signed-in user OWNS this
//                     profile. Sends them to /dashboard/enquiries.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, type ProfileFollower } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export function VendorProfileActions({
  username,
  ownerUserId,
}: {
  username: string;
  ownerUserId: string;
}) {
  const auth = useAuth();
  const [showFollowers, setShowFollowers] = useState(false);
  const isOwner =
    auth.status === 'authenticated' && auth.user.id === ownerUserId;

  return (
    <>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setShowFollowers(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-brand-purple/40 bg-white px-4 py-2.5 text-sm font-extrabold text-brand-purple transition hover:bg-brand-purple/5"
        >
          <UsersIcon className="h-4 w-4" />
          View Followers
        </button>
        {isOwner ? (
          <Link
            href="/dashboard/enquiries"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-gradient px-4 py-2.5 text-sm font-extrabold text-white shadow-purple"
          >
            <ChatIcon className="h-4 w-4" />
            View Enquiries
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-gradient px-4 py-2.5 text-sm font-extrabold text-white shadow-purple opacity-60"
            title="Only the stall owner can see enquiries"
          >
            <ChatIcon className="h-4 w-4" />
            View Enquiries
          </button>
        )}
      </div>

      {showFollowers && (
        <FollowersModal username={username} onClose={() => setShowFollowers(false)} />
      )}
    </>
  );
}

function FollowersModal({
  username,
  onClose,
}: {
  username: string;
  onClose: () => void;
}) {
  const [list, setList] = useState<ProfileFollower[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api.org
      .followers(username)
      .then((rows) => alive && setList(rows))
      .catch((e) =>
        alive && setErr(e instanceof ApiError ? e.message : (e as Error).message),
      );
    return () => {
      alive = false;
    };
  }, [username]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
        <header className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
          <h2 className="text-base font-extrabold text-navy-800">Followers</h2>
          <button type="button" onClick={onClose} className="text-ink-400 hover:text-navy-800" aria-label="Close">
            ×
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-3">
          {err ? (
            <p className="p-4 text-sm text-rose-700">⚠ {err}</p>
          ) : list === null ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-cream-100" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink-500">No followers yet.</p>
          ) : (
            <ul className="divide-y divide-black/[0.05]">
              {list.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-2 py-2.5">
                  {f.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-gradient text-xs font-extrabold text-white">
                      {(f.displayName ?? 'U').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="truncate text-sm font-semibold text-navy-800">
                    {f.displayName ?? 'Anonymous'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 21c0-3.5 3.1-6 7-6s7 2.5 7 6" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M22 18c0-2.5-2-4-4.5-4" strokeLinecap="round" />
    </svg>
  );
}
function ChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M21 12a8 8 0 0 1-11.7 7.07L4 21l1.9-4.3A8 8 0 1 1 21 12z" strokeLinejoin="round" />
      <path d="M9 11h6M9 14h4" strokeLinecap="round" />
    </svg>
  );
}
