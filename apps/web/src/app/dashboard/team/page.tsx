// /dashboard/team — invite co-organisers / event managers / approval delegates.

import Link from 'next/link';

export const metadata = { title: 'Team Members' };

export default function TeamPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-ribbon-purple">
          Organiser
        </div>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy-800 sm:text-[32px]">
          Team Members
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Invite co-organisers and event managers to help run your events.
        </p>
      </header>

      <div className="rounded-2xl border-2 border-dashed border-ribbon-purple/30 bg-cream-100 p-10 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-ribbon-purple/15 text-2xl">
          👥
        </div>
        <h3 className="text-base font-extrabold text-navy-800">You&apos;re flying solo</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
          Multi-user team accounts are coming soon. You&apos;ll be able to invite co-organisers,
          assign event-specific roles, and delegate KYC + booking approvals.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block rounded-2xl border border-black/10 bg-white px-5 py-2.5 text-sm font-bold text-navy-700 transition hover:bg-cream-100"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
