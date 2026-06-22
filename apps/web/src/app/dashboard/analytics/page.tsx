'use client';

// /dashboard/analytics — Revenue + bookings overview from real wallet,
// events, and booking data. No fake deltas or pre-baked trend arrays.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  api,
  type ApiBooking,
  type OwnerEvent,
  type WalletPayload,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Sparkline } from '@/components/dashboard/Sparkline';
import { AreaChart } from '@/components/dashboard/AreaChart';
import { Donut } from '@/components/dashboard/Donut';

type SparkPoint = { date: string; balance: number };
type BreakdownPayload = {
  totalPaise: number;
  categories: { reason: string; amountPaise: number; pct: number }[];
};

export default function AnalyticsPage() {
  const auth = useAuth();
  const [wallet, setWallet] = useState<WalletPayload | null>(null);
  const [events, setEvents] = useState<OwnerEvent[]>([]);
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [spark, setSpark] = useState<SparkPoint[] | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    (async () => {
      const [w, ev, bks, sp, br] = await Promise.all([
        api.wallet.mine().catch(() => null),
        api.events.mine().catch(() => [] as OwnerEvent[]),
        api.bookings.mine().catch(() => [] as ApiBooking[]),
        api.wallet
          .sparkline(30)
          .then((d) => d.points as SparkPoint[])
          .catch(() => [] as SparkPoint[]),
        api.wallet
          .breakdown()
          .catch(() => ({ totalPaise: 0, categories: [] }) as BreakdownPayload),
      ]);
      setWallet(w);
      setEvents(ev);
      setBookings(bks);
      setSpark(sp);
      setBreakdown(br);
      setLoaded(true);
    })();
  }, [auth.status]);

  if (!loaded) return <Skel />;

  const balanceRupees = wallet ? wallet.wallet.balancePaise / 100 : 0;
  const totalEvents = events.length;
  const liveEvents = events.filter((e) => e.status === 'live').length;
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed').length;
  const totalRevenue = bookings.reduce((s, b) => s + b.amountPaise, 0) / 100;
  const platformFees = bookings.reduce((s, b) => s + b.platformFeePaise, 0) / 100;
  const monthRevenueRupees = Math.round((breakdown?.totalPaise ?? 0) / 100);

  // Sparkline series from the wallet endpoint (real, day-by-day balance)
  const series = (spark ?? []).map((p) => p.balance);
  const subsetIdx =
    series.length > 0
      ? [
          0,
          Math.floor(series.length / 4),
          Math.floor(series.length / 2),
          Math.floor((series.length * 3) / 4),
          series.length - 1,
        ]
      : [];
  const subsetSeries = subsetIdx.map((i) => series[i] ?? 0);
  const subsetLabels = subsetIdx.map((i) =>
    spark?.[i]
      ? new Date(spark[i].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      : '',
  );

  // Breakdown segments with stable colour mapping per reason
  const COLOR_BY_REASON: Record<string, string> = {
    booking_received: 'text-emerald-500',
    booking_payment: 'text-brand-purple',
    booking_refund: 'text-rose-500',
    featured_purchase: 'text-ribbon-purple',
    subscription_charge: 'text-ribbon-blue',
    topup: 'text-ribbon-yellow',
    withdrawal: 'text-ink-400',
  };
  const LEGEND_BY_REASON: Record<string, string> = {
    booking_received: 'bg-emerald-500',
    booking_payment: 'bg-brand-purple',
    booking_refund: 'bg-rose-500',
    featured_purchase: 'bg-ribbon-purple',
    subscription_charge: 'bg-ribbon-blue',
    topup: 'bg-ribbon-yellow',
    withdrawal: 'bg-ink-400',
  };
  const segments = (breakdown?.categories ?? [])
    .filter((c) => c.pct > 0)
    .map((c) => ({
      value: c.pct,
      colorClass: COLOR_BY_REASON[c.reason] ?? 'text-ink-300',
      label: prettyReason(c.reason),
    }));

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-purple">
          Analytics
        </div>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy-800 sm:text-[32px]">
          Performance Overview
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Track revenue, bookings, and audience growth across your events.
        </p>
      </header>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI
          tint="bg-brand-purple/10 text-brand-purple"
          icon="💰"
          label="Total Revenue"
          value={`₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          caption={totalBookings === 0 ? 'No bookings yet' : `From ${totalBookings} bookings`}
          sparkColor="text-brand-purple"
          spark={subsetSeries.length > 1 ? subsetSeries : []}
        />
        <KPI
          tint="bg-emerald-100 text-emerald-600"
          icon="📅"
          label="Live Events"
          value={liveEvents.toString()}
          caption={totalEvents === 0 ? 'Create your first event' : `${totalEvents} total all-time`}
          sparkColor="text-emerald-500"
          spark={[]}
        />
        <KPI
          tint="bg-ribbon-purple/15 text-ribbon-purple"
          icon="🎫"
          label="Confirmed Bookings"
          value={confirmedBookings.toString()}
          caption={totalBookings === 0 ? 'Nothing booked yet' : `${totalBookings} total received`}
          sparkColor="text-ribbon-purple"
          spark={[]}
        />
        <KPI
          tint="bg-ribbon-yellow/30 text-amber-600"
          icon="👑"
          label="Platform Fees"
          value={`₹${platformFees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          caption={platformFees === 0 ? 'No fees yet' : '5% on bookings'}
          sparkColor="text-amber-500"
          spark={[]}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Wallet trend area chart */}
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-soft">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="text-base font-extrabold text-navy-800">Wallet Trend</div>
              <p className="mt-0.5 text-xs text-ink-500">Last 30 days · daily balance</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold tabular-nums text-navy-800">
                ₹{balanceRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-ink-500">Current balance</div>
            </div>
          </div>
          {subsetSeries.length > 1 ? (
            <AreaChart
              values={subsetSeries}
              labels={subsetLabels}
              colorClass="text-brand-purple"
              height={220}
              highlightIndex={subsetSeries.length - 1}
              highlightLabel={`₹${(subsetSeries[subsetSeries.length - 1] ?? 0).toLocaleString('en-IN')}`}
            />
          ) : (
            <div className="grid h-[220px] place-items-center rounded-2xl border-2 border-dashed border-black/10 bg-cream-50 text-sm text-ink-400">
              Not enough wallet activity yet to draw a trend.
            </div>
          )}
        </div>

        {/* Revenue breakdown donut */}
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-soft">
          <div className="text-base font-extrabold text-navy-800">Revenue Breakdown</div>
          <p className="mt-0.5 text-xs text-ink-500">
            This month · ₹{monthRevenueRupees.toLocaleString('en-IN')} credited
          </p>
          <div className="mt-4 flex flex-col items-center gap-4">
            {segments.length > 0 ? (
              <>
                <Donut
                  segments={segments}
                  centerValue={`${segments[0].value}%`}
                  centerCaption={segments[0].label}
                  size={160}
                  thickness={16}
                />
                <ul className="w-full space-y-2 text-sm">
                  {(breakdown?.categories ?? [])
                    .filter((c) => c.pct > 0)
                    .map((c) => (
                      <li key={c.reason} className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              LEGEND_BY_REASON[c.reason] ?? 'bg-ink-300'
                            }`}
                          />
                          <span className="text-ink-500">{prettyReason(c.reason)}</span>
                        </span>
                        <span className="font-bold tabular-nums text-navy-800">{c.pct}%</span>
                      </li>
                    ))}
                </ul>
              </>
            ) : (
              <div className="grid h-[200px] w-full place-items-center rounded-2xl border-2 border-dashed border-black/10 bg-cream-50 text-sm text-ink-400">
                No credits yet this month.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top events */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-base font-extrabold text-navy-800">Top Performing Events</div>
          <Link href="/dashboard/events" className="text-xs font-bold text-brand-purple hover:underline">
            View all
          </Link>
        </div>
        {events.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-400">
            No events yet.{' '}
            <Link href="/dashboard/events/new" className="font-bold text-brand-purple">
              Create your first →
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {[...events]
              .sort((a, b) => b.stalls.booked - a.stalls.booked)
              .slice(0, 5)
              .map((e) => {
                const occupancy =
                  e.stalls.available > 0
                    ? Math.round((e.stalls.booked / e.stalls.available) * 100)
                    : 0;
                const revenue = (e.stalls.booked * (e.stalls.priceFromPaise ?? 0)) / 100;
                return (
                  <li key={e.id} className="flex items-center gap-4 py-3.5">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-purple/30 via-ribbon-pink/20 to-ribbon-purple/30 text-lg">
                      🎪
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-navy-800">{e.title}</div>
                      <div className="text-xs text-ink-400">
                        {e.stalls.booked} of {e.stalls.available} stalls booked
                      </div>
                    </div>
                    <div className="hidden text-right sm:block">
                      <div className="text-xs font-medium text-ink-400">Occupancy</div>
                      <div className="text-sm font-extrabold tabular-nums text-navy-800">
                        {occupancy}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-ink-400">Revenue</div>
                      <div className="text-sm font-extrabold tabular-nums text-brand-purple">
                        ₹{revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </div>

      {/* Wallet balance hint */}
      <div className="rounded-3xl border border-black/5 bg-navy-spotlight p-6 text-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/65">
              Available Balance
            </div>
            <div className="mt-1 text-3xl font-extrabold tabular-nums">
              ₹{balanceRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-1 text-xs text-white/65">Ready to withdraw</div>
          </div>
          <Link
            href="/dashboard/wallet"
            className="inline-flex items-center gap-2 rounded-2xl bg-purple-gradient px-5 py-3 text-sm font-extrabold ring-1 ring-inset ring-white/15 transition hover:opacity-95"
          >
            Open Wallet →
          </Link>
        </div>
      </div>
    </div>
  );
}

function KPI({
  tint,
  icon,
  label,
  value,
  caption,
  sparkColor,
  spark,
}: {
  tint: string;
  icon: string;
  label: string;
  value: string;
  caption: string;
  sparkColor: string;
  spark: number[];
}) {
  const showSpark = spark.length > 1;
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-soft">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-[20px] ${tint}`}>
        {icon}
      </div>
      <div className="mt-3 text-[13px] font-semibold text-ink-500">{label}</div>
      <div className="mt-1 text-[26px] font-extrabold leading-none tabular-nums text-navy-800">
        {value}
      </div>
      <div className="mt-2 text-xs font-medium text-ink-400">{caption}</div>
      {showSpark && (
        <div className="mt-3 h-9">
          <Sparkline
            values={spark}
            colorClass={sparkColor}
            height={36}
            width={200}
            strokeWidth={2}
          />
        </div>
      )}
    </div>
  );
}

function prettyReason(reason: string): string {
  const map: Record<string, string> = {
    topup: 'Top-ups',
    booking_received: 'Stall Bookings',
    booking_payment: 'Bookings Paid',
    booking_refund: 'Refunds',
    featured_purchase: 'Featured Listings',
    subscription_charge: 'Subscriptions',
    withdrawal: 'Withdrawals',
  };
  return map[reason] ?? reason.replace(/_/g, ' ');
}

function Skel() {
  return (
    <div className="space-y-4">
      <div className="h-12 w-64 animate-pulse rounded-xl bg-white shadow-soft" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-40 animate-pulse rounded-3xl bg-white shadow-soft" />
        <div className="h-40 animate-pulse rounded-3xl bg-white shadow-soft" />
        <div className="h-40 animate-pulse rounded-3xl bg-white shadow-soft" />
        <div className="h-40 animate-pulse rounded-3xl bg-white shadow-soft" />
      </div>
      <div className="h-80 animate-pulse rounded-3xl bg-white shadow-soft" />
    </div>
  );
}
