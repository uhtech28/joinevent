'use client';

// Desktop sidebar — fixed 260px left rail, lg+ only.
// Mobile users get MobileNav (a drawer) controlled from the topbar hamburger.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  NAV,
  type Role,
  roleLabel,
  ChevronIcon,
  HeadsetIcon,
} from './nav-config';

export function Sidebar() {
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

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col overflow-y-auto bg-navy-900 text-white lg:flex"
      style={{
        backgroundImage:
          'radial-gradient(600px circle at -10% 110%, rgba(255,107,53,0.12), transparent 50%), radial-gradient(500px circle at 110% 0%, rgba(108,59,255,0.10), transparent 60%)',
      }}
    >
      {/* Brand */}
      <div className="px-6 pb-6 pt-7">
        <Link href="/" className="inline-flex items-baseline gap-0">
          <span className="text-[22px] font-extrabold tracking-tight text-white">Join</span>
          <span className="text-[22px] font-extrabold tracking-tight text-brand-purple-light">
            Events
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3">
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
                  className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                    active
                      ? 'bg-purple-gradient text-white shadow-purple ring-1 ring-inset ring-white/15'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] ${
                      active ? 'text-white' : 'text-white/60 group-hover:text-white'
                    }`}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold ${
                        active ? 'bg-white/20 text-white' : 'bg-brand-purple text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

      </nav>

      {/* User profile */}
      <div className="border-t border-white/10 px-4 py-3.5">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-white/5"
          onClick={() => auth.status === 'authenticated' && auth.logout()}
          title="Click to log out"
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
