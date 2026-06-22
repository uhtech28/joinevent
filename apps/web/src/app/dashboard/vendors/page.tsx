'use client';

// /dashboard/vendors — directory of vendors who've booked at the organiser's events.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type ApiBooking, type OwnerEvent } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type VendorEntry = {
  userId: string;
  bookings: number;
  totalSpentPaise: number;
  lastBookingAt: string;
};

export default function VendorsPage() {
  const auth = useAuth();
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [events, setEvents] = useState<OwnerEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    (async () => {
      // No dedicated endpoint yet — synthesize from bookings on user's events.
      const [bks, ev] = await Promise.all([
        api.bookings.mine().catch(() => [] as ApiBooking[]),
        api.events.mine().catch(() => [] as OwnerEvent[]),
      ]);
      setBookings(bks);
      setEvents(ev);
      setLoaded(true);
    })();
  }, [auth.status]);

  if (!loaded) {
    return (
      <div className="space-y-4">
        <div className="h-12 w-64 animate-pulse rounded-xl bg-white shadow-soft" />
        <div className="h-32 animate-pulse rounded-3xl bg-white shadow-soft" />
        <div className="h-32 animate-pulse rounded-3xl bg-white shadow-soft" />
      </div>
    );
  }

  // Aggregate by vendor (placeholder — real endpoint would expose this directly).
  const byVendor = new Map<string, VendorEntry>();
  bookings.forEach((b) => {
    // userId isn't exposed on ApiBooking.user — using bookingTxnId as a stable key proxy.
    const key = b.bookingTxnId.slice(0, 12);
    const existing = byVendor.get(key);
    if (existing) {
      existing.bookings += 1;
      existing.totalSpentPaise += b.amountPaise;
      if (b.createdAt > existing.lastBookingAt) existing.lastBookingAt = b.createdAt;
    } else {
      byVendor.set(key, {
        userId: key,
        bookings: 1,
        totalSpentPaise: b.amountPaise,
        lastBookingAt: b.createdAt,
      });
    }
  });

  let vendors = Array.from(byVendor.values()).sort(
    (a, b) => b.totalSpentPaise - a.totalSpentPaise,
  );

  if (q.trim()) {
    const needle = q.trim().toLowerCase();
    vendors = vendors.filter((v) => v.userId.toLowerCase().includes(needle));
  }

  const totalVendors = byVendor.size;
  const totalRevenue =
    Array.from(byVendor.values()).reduce((s, v) => s + v.totalSpentPaise, 0) / 100;
  const repeatVendors = Array.from(byVendor.values()).filter((v) => v.bookings > 1).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-ribbon-blue">
            Find Vendors
          </div>
          <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy-800 sm:text-[32px]">
            Vendor Directory
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Stall owners who&apos;ve booked space at your events. Re-engage your best customers.
          </p>
        </div>
      </header>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryTile
          tint="bg-ribbon-blue/15 text-ribbon-blue"
          icon="👥"
          label="Total Vendors"
          value={totalVendors.toString()}
          caption="across all events"
        />
        <SummaryTile
          tint="bg-emerald-100 text-emerald-600"
          icon="🔁"
          label="Repeat Vendors"
          value={repeatVendors.toString()}
          caption={
            totalVendors > 0
              ? `${Math.round((repeatVendors / totalVendors) * 100)}% loyalty rate`
              : 'no repeat customers yet'
          }
        />
        <SummaryTile
          tint="bg-brand-purple/10 text-brand-purple"
          icon="💼"
          label="Revenue From Vendors"
          value={`₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          caption="lifetime value"
        />
      </div>

      {/* Search */}
      <div className="rounded-3xl border border-black/5 bg-white p-4 shadow-soft sm:p-5">
        <div className="relative w-full max-w-md">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Search vendors…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 w-full rounded-xl border border-black/5 bg-white pl-10 pr-3 text-sm font-medium text-ink-700 outline-none transition focus:border-brand-purple/40 focus:ring-2 focus:ring-brand-purple/15"
          />
        </div>
      </div>

      {/* Vendor list */}
      {vendors.length === 0 ? (
        <EmptyState hasEvents={events.length > 0} />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-soft">
          <table className="w-full">
            <thead className="border-b border-black/5 bg-cream-100">
              <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-ink-500">
                <th className="px-5 py-3.5">Vendor</th>
                <th className="px-5 py-3.5">Bookings</th>
                <th className="px-5 py-3.5">Total Spent</th>
                <th className="hidden px-5 py-3.5 sm:table-cell">Last Booking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {vendors.map((v) => (
                <tr key={v.userId} className="hover:bg-cream-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-ribbon-purple/40 via-ribbon-blue/30 to-emerald-200/40 text-sm font-extrabold text-navy-800">
                        {v.userId.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-navy-800">
                          Vendor #{v.userId.slice(0, 6)}
                        </div>
                        <div className="text-[11px] text-ink-400">tx: {v.userId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center rounded-full bg-ribbon-blue/10 px-2.5 py-1 text-xs font-bold text-ribbon-blue">
                      {v.bookings}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm font-extrabold tabular-nums text-brand-purple">
                    ₹{(v.totalSpentPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="hidden px-5 py-4 text-sm text-ink-500 sm:table-cell">
                    {new Date(v.lastBookingAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryTile({
  tint,
  icon,
  label,
  value,
  caption,
}: {
  tint: string;
  icon: string;
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-soft">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-[20px] ${tint}`}>
        {icon}
      </div>
      <div className="mt-3 text-sm font-medium text-ink-500">{label}</div>
      <div className="mt-1 text-[26px] font-extrabold leading-none tabular-nums text-navy-800">
        {value}
      </div>
      <div className="mt-1 text-xs text-ink-400">{caption}</div>
    </div>
  );
}

function EmptyState({ hasEvents }: { hasEvents: boolean }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-ribbon-blue/40 bg-cream-100 p-10 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-ribbon-blue/15 text-3xl">
        👥
      </div>
      <h3 className="text-xl font-extrabold text-navy-800">
        {hasEvents ? 'No vendors yet' : 'Create an event first'}
      </h3>
      <p className="mt-2 text-sm text-ink-500">
        {hasEvents
          ? 'Vendors appear here once they book stalls at your events.'
          : 'You need to publish at least one event before vendors can book.'}
      </p>
      <Link
        href={hasEvents ? '/dashboard/events' : '/dashboard/events/new'}
        className="btn btn-primary mt-5 inline-block"
      >
        {hasEvents ? 'Manage events' : 'Create event'}
      </Link>
    </div>
  );
}
