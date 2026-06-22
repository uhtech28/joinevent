'use client';

// Dashboard shell — fixed sidebar on desktop, slide-in drawer on mobile.
// All /dashboard/* routes inherit this chrome.

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TopBar } from '@/components/dashboard/TopBar';
import { MobileNav } from '@/components/dashboard/MobileNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Auto-close drawer on route change so a nav tap on mobile feels natural.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (auth.status === 'anonymous') {
      router.replace('/login');
      return;
    }
    if (auth.status === 'authenticated' && !auth.user.onboardedAt) {
      router.replace('/onboarding/role');
    }
  }, [auth.status, router]);

  if (auth.status === 'loading') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-cream-100">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cream-200 border-t-brand-purple" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] bg-cream-100">
      {/* Desktop persistent sidebar (lg+) */}
      <Sidebar />
      {/* Mobile/tablet slide-in drawer (<lg) */}
      <MobileNav open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col lg:ml-[260px]">
        <TopBar onMenuOpen={() => setDrawerOpen(true)} />
        <main
          className="flex-1 px-3 pb-10 pt-4 sm:px-6 sm:pb-12 lg:px-8"
          style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
