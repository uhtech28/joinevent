'use client';

// NotificationsBell — bell icon + unread badge in the Header.
// Polls /notifications/unread-count every 60s when signed in.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const POLL_MS = 60_000;

export function NotificationsBell({ variant }: { variant: 'desktop' | 'mobile' }) {
  const auth = useAuth();
  const [unread, setUnread] = useState<number | null>(null);

  useEffect(() => {
    if (auth.status !== 'authenticated') {
      setUnread(null);
      return;
    }
    let alive = true;
    const tick = async () => {
      try {
        const { unread } = await api.notifications.unreadCount();
        if (alive) setUnread(unread);
      } catch {
        /* ignore — auth race or transient */
      }
    };
    tick();
    const id = window.setInterval(tick, POLL_MS);
    // Also refresh when the tab regains focus.
    const onFocus = () => tick();
    window.addEventListener('focus', onFocus);
    return () => {
      alive = false;
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [auth.status]);

  if (auth.status !== 'authenticated') return null;

  const size = variant === 'desktop' ? 18 : 16;
  const padding = variant === 'desktop' ? 'p-2' : 'p-1.5';
  const showCount = (unread ?? 0) > 0;

  return (
    <Link
      href="/dashboard/notifications"
      className={`relative inline-flex items-center justify-center rounded-xl ${padding} text-ink-600 transition hover:bg-cream-200`}
      aria-label={
        showCount
          ? `${unread} unread notification${unread === 1 ? '' : 's'}`
          : 'Notifications'
      }
      title="Notifications"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showCount && (
        <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold leading-none text-white shadow-brand">
          {unread! > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
