'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NAV_LINKS, WAITLIST_URL } from '@/lib/constants';
import { useAuth } from '@/lib/auth-context';
import { NotificationsBell } from '../NotificationsBell';

export function Header() {
  const [open, setOpen] = useState(false);
  const auth = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/5 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-[5%] py-[18px] sm:px-[7%]">
        {/* Logo */}
        <Link
          href="/"
          className="text-[22px] font-extrabold tracking-tight text-ink-600 sm:text-[27px]"
        >
          Join<span className="text-brand-orange">Events</span>.in
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-[14px] font-semibold text-ink-600 transition hover:text-brand-orange"
            >
              {link.label}
            </a>
          ))}
          <AuthCorner variant="desktop" />
        </nav>

        {/* Mobile actions */}
        <div className="flex items-center gap-2 lg:hidden">
          <AuthCorner variant="mobile" />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            className="rounded-lg border border-black/10 p-2 text-ink-600"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              {open ? (
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M3 6h14M3 10h14M3 14h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav className="border-t border-black/5 bg-white px-[5%] py-4 lg:hidden">
          <div className="grid gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-[15px] font-medium text-ink-500 hover:bg-cream-200 hover:text-brand-orange"
              >
                {link.label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );

  function AuthCorner({ variant }: { variant: 'desktop' | 'mobile' }) {
    // Visual differences only — same logic both sides.
    const baseDesktop =
      'rounded-xl px-[18px] py-[11px] text-[14px] font-semibold transition whitespace-nowrap';
    const baseMobile = 'rounded-xl px-3 py-[9px] text-[13px] font-semibold';
    const base = variant === 'desktop' ? baseDesktop : baseMobile;

    if (auth.status === 'loading') {
      return (
        <span
          aria-hidden
          className={`${base} bg-cream-200 text-ink-300`}
        >
          …
        </span>
      );
    }

    if (auth.status === 'authenticated') {
      return (
        <span className={variant === 'desktop' ? 'flex items-center gap-3' : 'flex items-center gap-2'}>
          <NotificationsBell variant={variant} />
          {auth.user.isAdmin && (
            <Link
              href="/admin"
              className={`${base} bg-purple-gradient text-white shadow-purple hover:opacity-90`}
            >
              Admin
            </Link>
          )}
          <Link
            href="/dashboard"
            className={`${base} bg-brand-orange text-white shadow-brand hover:bg-brand-orange-dark`}
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => auth.logout()}
            className={`${base} border border-black/10 bg-white text-ink-600 hover:bg-cream-200`}
          >
            Logout
          </button>
        </span>
      );
    }

    return (
      <span className={variant === 'desktop' ? 'flex items-center gap-3' : 'flex items-center gap-2'}>
        <Link
          href="/login"
          className={`${base} border border-black/10 bg-white text-ink-600 hover:bg-cream-200`}
        >
          Login
        </Link>
        <a
          href={WAITLIST_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`${base} bg-brand-orange text-white shadow-brand hover:bg-brand-orange-dark`}
        >
          Join
        </a>
      </span>
    );
  }
}
