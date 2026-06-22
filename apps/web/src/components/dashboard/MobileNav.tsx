'use client';

// Mobile/tablet drawer — same nav content as the desktop sidebar, but
// slides in from the left over the content. Closes on backdrop click,
// Escape key, or any nav-link click. Body scroll locked while open.

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  NAV,
  type Role,
  roleLabel,
  ChevronIcon,
  CloseIcon,
  HeadsetIcon,
} from './nav-config';

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const auth = useAuth();
  const user = auth.status === 'authenticated' ? auth.user : null;
  const role: Role = (user?.primaryRole as Role) ?? 'user';
  const displayName = (user?.displayName ?? user?.email ?? user?.phone ?? 'You').toString();
  const initials =
    displayName
      .replace(/[^A-Za-z\s]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('') || 'U';
  const visibleNav = NAV.filter((item) => item.roles.includes(role));

  // Lock body scroll + listen for Escape while drawer is open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-navy-900/60 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[88vw] flex-col overflow-y-auto bg-navy-900 text-white shadow-2xl transition-transform duration-200 lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          backgroundImage:
            'radial-gradient(600px circle at -10% 110%, rgba(255,107,53,0.12), transparent 50%), radial-gradient(500px circle at 110% 0%, rgba(108,59,255,0.10), transparent 60%)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Brand + close */}
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <Link
            href="/"
            onClick={onClose}
            className="inline-flex items-baseline gap-0.5 text-[18px] font-extrabold tracking-tight text-white"
          >
            Join<span className="text-brand-purple">Events</span>
            <span className="text-white/80">.in</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/70 hover:bg-white/5 hover:text-white"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pb-4">
          <ul className="space-y-1">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);
              return (
                <li key={`${item.href}-${item.label}`}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`group flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-semibold transition ${
                      active
                        ? 'bg-purple-gradient text-white ring-1 ring-inset ring-white/15'
                        : 'text-white/75 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`h-[18px] w-[18px] flex-shrink-0 ${
                        active ? 'text-white' : 'text-white/60 group-hover:text-white'
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-purple px-1.5 text-[11px] font-extrabold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

        </nav>

        {/* User profile + help — sticks to the bottom */}
        <div className="border-t border-white/10 px-4 py-3">
          <button
            type="button"
            className="flex w-full min-h-[44px] items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-white/5"
            onClick={() => {
              onClose();
              if (auth.status === 'authenticated') auth.logout();
            }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-gradient text-sm font-extrabold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-white">{prettyName(displayName)}</div>
              <div className="text-[11px] font-medium text-ribbon-yellow">{roleLabel(role)}</div>
            </div>
            <ChevronIcon className="h-4 w-4 text-white/60" />
          </button>
        </div>
      </aside>
    </>
  );
}

function prettyName(raw: string): string {
  if (raw.includes('@')) {
    const local = raw.split('@')[0] ?? '';
    const cleaned = local.replace(/[._-]+/g, ' ').replace(/\+.*/, '').trim();
    return cleaned
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('') || 'You';
  }
  return raw;
}
