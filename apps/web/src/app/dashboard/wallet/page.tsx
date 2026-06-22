'use client';

// /dashboard/wallet — wallet UI.
// Shows balance, pending (escrow), and the last ledger entries. The "Add money"
// flow uses the stubbed PayU in dev (instant credit). In production, the same
// button kicks the user to PayU's hosted page.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError, type ApiWalletEntry, type WalletPayload } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const QUICK_TOPUPS = [100, 500, 1000, 2000] as const; // ₹

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

export default function WalletPage() {
  const auth = useAuth();
  const router = useRouter();
  const [data, setData] = useState<WalletPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');

  // Redirect anonymous users.
  useEffect(() => {
    if (auth.status === 'anonymous') router.replace('/login');
  }, [auth.status, router]);

  const fetchWallet = useCallback(async () => {
    try {
      const w = await api.wallet.mine();
      setData(w);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message);
    }
  }, []);

  useEffect(() => {
    if (auth.status === 'authenticated') fetchWallet();
  }, [auth.status, fetchWallet]);

  async function topup(rupees: number) {
    setBusy(true);
    setError(null);
    setToast(null);
    try {
      const res = await api.wallet.topup(rupees * 100);
      if (res.status === 'redirect_required') {
        window.location.href = res.paymentUrl;
        return;
      }
      setToast(`Added ₹${rupees}. New balance ${inr(res.newBalancePaise)}.`);
      await fetchWallet();
    } catch (err) {
      setError(err instanceof ApiError ? `${err.code}: ${err.message}` : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const onCustomTopup = () => {
    const n = Number(customAmount);
    if (!Number.isFinite(n) || n < 10 || n > 10_000) {
      setError('Custom amount must be between ₹10 and ₹10,000');
      return;
    }
    setCustomAmount('');
    void topup(Math.round(n));
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-2 sm:px-6 sm:py-4">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-purple hover:underline"
        >
          ← Back to dashboard
        </Link>

        <h1 className="bg-purple-gradient-text bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
          Your wallet
        </h1>
        <p className="mt-2 text-ink-400">
          Money for booking stalls and receiving payouts. Credits and debits land here in real time.
        </p>

        {/* Balance card */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl bg-purple-gradient p-6 text-white shadow-glow">
            <div className="text-xs font-bold uppercase tracking-wide opacity-80">Available</div>
            <div className="mt-1 text-4xl font-extrabold leading-tight">
              {data ? inr(data.wallet.balancePaise) : '…'}
            </div>
            <div className="mt-3 text-sm opacity-80">Spend on stall bookings & event boosts.</div>
          </div>
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-card">
            <div className="text-xs font-bold uppercase tracking-wide text-ink-300">In escrow</div>
            <div className="mt-1 text-4xl font-extrabold leading-tight text-ink-700">
              {data ? inr(data.wallet.pendingPaise) : '…'}
            </div>
            <div className="mt-3 text-sm text-ink-400">
              Held for upcoming events. Releases automatically T+1 after the event.
            </div>
          </div>
        </section>

        {/* Top-up */}
        <section className="mt-8 rounded-3xl border border-black/5 bg-white p-5 shadow-card sm:p-6">
          <h2 className="text-lg font-bold text-ink-700">Add money</h2>
          <p className="mt-1 text-sm text-ink-300">
            Top up to book stalls or boost listings. UPI, cards and netbanking — all routed through
            PayU.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_TOPUPS.map((rupees) => (
              <button
                key={rupees}
                type="button"
                onClick={() => topup(rupees)}
                disabled={busy}
                className="btn btn-secondary !py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                + ₹{rupees}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex-1">
              <span className="mb-1 block text-xs font-semibold text-ink-300">Custom amount (₹)</span>
              <input
                type="number"
                min={10}
                max={10000}
                step={10}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="e.g. 350"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-base outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20"
              />
            </label>
            <button
              type="button"
              onClick={onCustomTopup}
              disabled={busy || !customAmount}
              className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add
            </button>
          </div>

          {toast && (
            <div className="mt-4 rounded-xl border border-emerald-300/40 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              ✅ {toast}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-xl border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
        </section>

        {/* Withdraw money */}
        <section className="mt-8 rounded-3xl border border-black/5 bg-white p-5 shadow-card sm:p-6">
          <h2 className="text-lg font-bold text-ink-700">Withdraw to bank</h2>
          <p className="mt-1 text-sm text-ink-300">
            ₹5 flat fee. Admin reviews and queues for bank transfer (T+1 in production).
          </p>
          <WithdrawForm />
        </section>

        {/* Recent history */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-ink-700">Recent transactions</h2>
          {!data && <div className="h-32 animate-pulse rounded-2xl bg-white shadow-card" />}
          {data && data.entries.length === 0 && (
            <p className="rounded-2xl border-2 border-dashed border-brand-purple/40 bg-cream-200 p-8 text-center text-sm text-ink-400">
              No transactions yet. Add some money above.
            </p>
          )}
          {data && data.entries.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card">
              <ul className="divide-y divide-black/5">
                {data.entries.map((e) => (
                  <EntryRow key={e.id} entry={e} />
                ))}
              </ul>
            </div>
          )}
        </section>
    </main>
  );
}

function WithdrawForm() {
  const [amount, setAmount] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [bankAccountRef, setBankAccountRef] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const n = Number(amount);
      if (!Number.isFinite(n) || n < 100 || n > 100_000) {
        throw new Error('Amount must be between ₹100 and ₹1,00,000');
      }
      await api.withdrawals.request({
        amountPaise: Math.round(n * 100),
        accountHolder: accountHolder.trim(),
        bankAccountRef: bankAccountRef.trim(),
        ifsc: ifsc.trim().toUpperCase(),
      });
      setMsg({ kind: 'ok', text: 'Withdrawal requested. Funds are held until admin approves.' });
      setAmount('');
    } catch (err) {
      setMsg({
        kind: 'err',
        text: err instanceof ApiError ? err.message : (err as Error).message,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount ₹"
        min={100}
        max={100_000}
        required
        className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-brand-purple"
      />
      <input
        type="text"
        value={accountHolder}
        onChange={(e) => setAccountHolder(e.target.value)}
        placeholder="Account holder name"
        required
        className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-brand-purple"
      />
      <input
        type="text"
        value={bankAccountRef}
        onChange={(e) => setBankAccountRef(e.target.value)}
        placeholder="Account number"
        required
        className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-brand-purple"
      />
      <input
        type="text"
        value={ifsc}
        onChange={(e) => setIfsc(e.target.value.toUpperCase())}
        placeholder="IFSC (e.g. SBIN0123456)"
        required
        maxLength={11}
        className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-brand-purple"
      />
      <div className="sm:col-span-2 flex items-center justify-between">
        {msg && (
          <span
            className={`text-sm ${
              msg.kind === 'ok' ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {msg.text}
          </span>
        )}
        <button
          type="submit"
          disabled={busy}
          className="btn btn-secondary !py-2 disabled:opacity-60"
        >
          {busy ? 'Requesting…' : 'Request withdrawal'}
        </button>
      </div>
    </form>
  );
}

function EntryRow({ entry }: { entry: ApiWalletEntry }) {
  const isCredit = entry.direction === 'C';
  const label =
    {
      topup: isCredit ? 'Money added' : 'Top-up debit',
      stall_booking: isCredit ? 'Booking received' : 'Stall booked',
      commission: 'Platform fee',
      refund: isCredit ? 'Refunded to you' : 'Refund issued',
      withdrawal: 'Withdrawal',
      manual_adjustment: 'Manual adjustment',
    }[entry.reason] ?? entry.reason;

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink-700">{label}</div>
        <div className="text-xs text-ink-300">
          {new Date(entry.createdAt).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit',
          })}
          {entry.bucket === 'pending' && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">
              held
            </span>
          )}
        </div>
      </div>
      <div
        className={`text-sm font-bold ${
          isCredit ? 'text-emerald-700' : 'text-rose-700'
        }`}
      >
        {isCredit ? '+' : '−'} ₹{(entry.amountPaise / 100).toLocaleString('en-IN')}
      </div>
    </li>
  );
}
