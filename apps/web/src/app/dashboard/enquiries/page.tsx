// /dashboard/enquiries — incoming stall requests + partnership messages.

import Link from 'next/link';

export const metadata = { title: 'Enquiries' };

export default function EnquiriesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-ribbon-purple">
          Inbox
        </div>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy-800 sm:text-[32px]">
          Enquiries
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Stall requests, sponsorships, and partnership messages.
        </p>
      </header>

      <div className="rounded-2xl border-2 border-dashed border-ribbon-purple/30 bg-cream-100 p-10 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-ribbon-purple/15 text-2xl">
          💬
        </div>
        <h3 className="text-base font-extrabold text-navy-800">No enquiries yet</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
          When vendors or other businesses reach out about your events, their messages will land here.
          For now, vendors book stalls directly.
        </p>
        <Link
          href="/dashboard/events"
          className="mt-4 inline-block rounded-2xl border border-black/10 bg-white px-5 py-2.5 text-sm font-bold text-navy-700 transition hover:bg-cream-100"
        >
          Manage events
        </Link>
      </div>
    </div>
  );
}
