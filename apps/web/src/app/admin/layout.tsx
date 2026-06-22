'use client';

// Admin shell — sidebar + main pane. Client-side guard: anonymous → /login;
// authenticated but not admin → /. The backend AdminGuard is the real gate;
// this just avoids flashing UI to non-admins.

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Header } from '@/components/landing/Header';
import { useAuth } from '@/lib/auth-context';

const LINKS = [
  { href: '/admin', label: 'Overview', exact: true },
  { href: '/admin/kyc', label: 'KYC Queue' },
  { href: '/admin/withdrawals', label: 'Withdrawals' },
  { href: '/admin/audit-log', label: 'Audit Log' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (auth.status === 'anonymous') {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/admin')}`);
    } else if (auth.status === 'authenticated' && !auth.user.isAdmin) {
      router.replace('/');
    }
  }, [auth, router, pathname]);

  if (auth.status !== 'authenticated' || !auth.user.isAdmin) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-md p-10 text-center text-ink-400">Loading…</main>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-3xl border border-black/5 bg-white p-5 shadow-card lg:sticky lg:top-24 lg:self-start">
          <div className="mb-4 text-[11px] font-extrabold uppercase tracking-wide text-ink-300">
            Admin Console
          </div>
          <nav className="grid gap-1">
            {LINKS.map((l) => {
              const active = l.exact ? pathname === l.href : pathname?.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? 'bg-brand-orange text-white shadow-brand'
                      : 'text-ink-500 hover:bg-cream-200'
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-6 rounded-xl bg-cream-200 px-3 py-2 text-[11px] text-ink-400">
            Signed in as <strong className="text-ink-700">{auth.user.phone}</strong>
          </div>
        </aside>

        <main>{children}</main>
      </div>
    </>
  );
}
