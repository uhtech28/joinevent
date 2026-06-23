'use client';

// Dashboard top bar — hamburger (mobile) · search · notification bell · Create Event CTA.
// Heights, paddings, and text sizes adapt to mobile / tablet / desktop.

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MenuIcon } from './nav-config';
import { useAuth } from '@/lib/auth-context';

export function TopBar({ onMenuOpen }: { onMenuOpen: () => void }) {
  const router = useRouter();
  const auth = useAuth();
  // Only organisers can create events. Members and stall-owners don't need
  // this CTA at all — they apply to events instead.
  const isOrganiser =
    auth.status === 'authenticated' && auth.user.primaryRole === 'organiser';
  const [q, setQ] = useState('');
  const [unread] = useState(0);

  // Cmd/Ctrl + K to focus search (desktop convenience)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const el = document.getElementById('topbar-search');
        if (el instanceof HTMLInputElement) el.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term) router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-2 border-b border-black/5 bg-cream-100/85 px-3 py-3 backdrop-blur-lg sm:gap-3 sm:px-6 lg:px-8"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      {/* Hamburger — only on mobile/tablet */}
      <button
        type="button"
        onClick={onMenuOpen}
        aria-label="Open menu"
        className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-black/5 bg-white text-navy-800 shadow-soft transition hover:bg-cream-100 lg:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      {/* Search */}
      <form onSubmit={onSubmit} className="flex flex-1 items-center">
        <div className="relative w-full max-w-2xl">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            id="topbar-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events, stalls, organisers…"
            // 16px font-size on mobile prevents iOS auto-zoom on focus
            className="h-11 w-full rounded-2xl border border-black/5 bg-white pl-10 pr-3 text-[16px] font-medium text-ink-700 shadow-soft outline-none transition focus:border-ribbon-purple/40 focus:ring-2 focus:ring-ribbon-purple/15 sm:pl-11 sm:pr-16 sm:text-sm"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden h-6 -translate-y-1/2 items-center gap-0.5 rounded-md border border-black/10 bg-cream-100 px-2 text-[10px] font-bold uppercase tracking-wider text-ink-400 sm:inline-flex">
            ⌘ K
          </kbd>
        </div>
      </form>

      {/* All Locations selector (visual — clicking takes you to /events) */}
      <Link
        href="/dashboard/explore"
        className="hidden h-11 flex-shrink-0 items-center gap-1.5 rounded-2xl border border-black/5 bg-white px-3.5 text-sm font-semibold text-ink-700 shadow-soft transition hover:bg-cream-100 md:inline-flex"
        aria-label="Change location"
      >
        <PinIcon className="h-4 w-4 text-ribbon-pink" />
        <span>All Locations</span>
      </Link>

      {/* Notifications */}
      <Link
        href="/dashboard/notifications"
        className="relative inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-black/5 bg-white text-ink-600 shadow-soft transition hover:bg-cream-100"
        aria-label="Notifications"
      >
        <BellIcon className="h-[18px] w-[18px]" />
        <span className="absolute right-2.5 top-2.5 inline-flex h-2 w-2 rounded-full bg-brand-purple ring-2 ring-white" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ribbon-purple px-1 text-[10px] font-extrabold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Link>

      {/* Create Event — organiser-only. Members / stall-owners apply to
          events instead of creating them, so the CTA is hidden for them. */}
      {isOrganiser && (
        <Link
          href="/dashboard/events/new"
          aria-label="Create event"
          className="inline-flex h-11 flex-shrink-0 items-center gap-2 rounded-2xl bg-purple-gradient px-3 text-sm font-extrabold text-white shadow-purple ring-1 ring-inset ring-white/15 transition hover:opacity-95 sm:px-4 lg:px-5"
        >
          <span className="text-lg leading-none">+</span>
          <span className="hidden sm:inline">Create Event</span>
        </Link>
      )}
    </header>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinejoin="round" />
    </svg>
  );
}
function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 0 1 9.5 9 2.5 2.5 0 0 1 12 6.5 2.5 2.5 0 0 1 14.5 9 2.5 2.5 0 0 1 12 11.5z" />
    </svg>
  );
}
