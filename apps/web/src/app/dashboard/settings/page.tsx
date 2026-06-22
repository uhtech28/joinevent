'use client';

// /dashboard/settings — Linear/Stripe-style settings hub.
// Sections: Account · Session · Danger zone.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function SettingsPage() {
  const router = useRouter();
  const auth = useAuth();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [busy, setBusy] = useState<'logout' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onLogout() {
    if (busy) return;
    setBusy('logout');
    try {
      if (auth.status === 'authenticated') await auth.logout();
      router.push('/login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
      setBusy(null);
    }
  }

  async function onDelete() {
    if (busy) return;
    setBusy('delete');
    setError(null);
    try {
      await api.auth.deleteAccount();
      if (auth.status === 'authenticated') {
        try {
          await auth.logout();
        } catch {
          /* best-effort */
        }
      }
      router.push('/?account_deleted=1');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
      setBusy(null);
    }
  }

  const emailOrPhone =
    auth.status === 'authenticated' ? auth.user?.email || auth.user?.phone || '' : '';
  // Organiser/vendor accounts edit their full BusinessProfile (avatar, cover,
  // bio, socials, etc); regular members only need to set name + avatar on
  // their user row, which lives at a different route.
  const role = auth.status === 'authenticated' ? auth.user.primaryRole : 'user';
  const editProfileHref =
    role === 'organiser' || role === 'vendor'
      ? '/dashboard/profile/edit'
      : '/dashboard/settings/profile';
  const editProfileSubtitle =
    role === 'organiser' || role === 'vendor'
      ? 'Photo, display name, bio, and location'
      : 'Set the name and photo that show on your comments';

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* ---------- Page header ---------- */}
      <header className="border-b border-black/[0.06] pb-6">
        <h1 className="text-[26px] font-extrabold tracking-tight text-navy-800 sm:text-[28px]">
          Settings
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Manage your profile, alerts, and account preferences
          {emailOrPhone && (
            <>
              {' '}for <span className="font-semibold text-navy-700">{emailOrPhone}</span>
            </>
          )}
          .
        </p>
      </header>

      {/* ---------- Account section ---------- */}
      <Section title="Account">
        <Row
          href={editProfileHref}
          icon={<UserIcon className="h-[18px] w-[18px]" />}
          title="Edit profile"
          subtitle={editProfileSubtitle}
        />
        <Row
          href="/dashboard/notifications"
          icon={<BellIcon className="h-[18px] w-[18px]" />}
          title="Notifications"
          subtitle="Review recent alerts and updates"
        />
        <Row
          href="/help"
          icon={<HelpIcon className="h-[18px] w-[18px]" />}
          title="Help centre"
          subtitle="FAQs, support and contact options"
          last
        />
      </Section>

      {/* ---------- Session section ---------- */}
      <Section title="Session">
        <button
          type="button"
          onClick={onLogout}
          disabled={!!busy}
          className="group flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-cream-50 disabled:opacity-50"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream-100 text-ink-500 transition group-hover:bg-cream-200 group-hover:text-navy-800">
            <LogOutIcon className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-navy-800">
              {busy === 'logout' ? 'Logging out…' : 'Log out'}
            </span>
            <span className="block text-[12.5px] text-ink-500">
              End your session on this device
            </span>
          </span>
          <ChevronIcon className="h-3.5 w-3.5 text-ink-300 transition group-hover:text-ink-500" />
        </button>
      </Section>

      {/* ---------- Danger zone ---------- */}
      <section>
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-red-600">
          Danger zone
        </h2>
        <div className="overflow-hidden rounded-xl border border-red-200/70 bg-white">
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={!!busy}
              className="group flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-red-50/60 disabled:opacity-50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 transition group-hover:bg-red-100">
                <TrashIcon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-red-700">
                  Delete account
                </span>
                <span className="block text-[12.5px] text-ink-500">
                  Permanently close your account and log out
                </span>
              </span>
              <ChevronIcon className="h-3.5 w-3.5 text-red-300 transition group-hover:text-red-500" />
            </button>
          ) : (
            <div className="p-5">
              <h3 className="text-sm font-extrabold text-red-700">
                Delete your account?
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
                This soft-deletes your account and signs you out everywhere. Your
                events, bookings, and reviews stay anonymised in the system for
                audit. You will not be able to sign in again with the same email
                or phone.
              </p>
              <label className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-ink-500">
                Type <span className="font-mono normal-case text-red-600">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                className="mt-1.5 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-bold uppercase tracking-wider text-red-700 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={deleteText !== 'DELETE' || busy === 'delete'}
                  className="rounded-lg bg-red-600 px-3.5 py-2 text-[13px] font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === 'delete' ? 'Deleting…' : 'Delete my account'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingDelete(false);
                    setDeleteText('');
                  }}
                  disabled={busy === 'delete'}
                  className="rounded-lg border border-black/[0.08] bg-white px-3.5 py-2 text-[13px] font-semibold text-navy-700 transition hover:bg-cream-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
          ⚠ {error}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Section — small uppercase label + bordered card containing rows
// ============================================================
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">
        {title}
      </h2>
      <div className="overflow-hidden rounded-xl border border-black/[0.06] bg-white">
        {children}
      </div>
    </section>
  );
}

// ============================================================
// Row — single navigable settings entry
// ============================================================
function Row({
  href,
  icon,
  title,
  subtitle,
  last,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-cream-50 ${
        last ? '' : 'border-b border-black/[0.05]'
      }`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream-100 text-ink-500 transition group-hover:bg-cream-200 group-hover:text-navy-800">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-navy-800">{title}</span>
        <span className="block text-[12.5px] text-ink-500">{subtitle}</span>
      </span>
      <ChevronIcon className="h-3.5 w-3.5 text-ink-300 transition group-hover:text-ink-500" />
    </Link>
  );
}

// ---------- Icons ----------
function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" strokeLinecap="round" />
    </svg>
  );
}
function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function HelpIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5A2.5 2.5 0 0 1 12 7c1.4 0 2.5 1 2.5 2.3 0 1.4-1.3 1.7-2.5 2.7v1" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}
function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
