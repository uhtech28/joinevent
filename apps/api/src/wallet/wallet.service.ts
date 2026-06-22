import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type {
  PublicWallet,
  PublicWalletEntry,
  WalletOwnerType,
  WalletWithEntries,
} from './dto/wallet.dto';

type Bucket = 'available' | 'pending';

/**
 * WalletService — the heart of platform money.
 *
 * Two key methods:
 *  - getOrCreate(ownerType, ownerId): the wallet for an entity (lazily created)
 *  - transfer(...): an atomic double-entry transfer between wallets
 *
 * Every transfer:
 *  1. Runs inside a Postgres transaction
 *  2. Writes ≥2 wallet_entries sharing a txn_id
 *  3. Updates the materialised balance on each wallet
 *  4. Preserves the invariant: sum(debit amounts) == sum(credit amounts)
 *
 * No floats. Money is always integer paise (₹1 = 100 paise).
 */
@Injectable()
export class WalletService {
  private readonly log = new Logger(WalletService.name);

  constructor(private readonly db: PrismaService) {}

  // ============================================================
  async getOrCreate(ownerType: WalletOwnerType, ownerId: string | null): Promise<PublicWallet> {
    // Find first because the unique uses (ownerType, ownerId) but Prisma can't
    // express the NULL case in @@unique cleanly.
    const existing = await this.db.wallet.findFirst({
      where: { ownerType, ownerId: ownerId ?? null },
    });
    if (existing) return this.toPublic(existing);

    try {
      const created = await this.db.wallet.create({
        data: { ownerType, ownerId },
      });
      return this.toPublic(created);
    } catch (err) {
      // Race: another request created the wallet at the same time.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const again = await this.db.wallet.findFirst({
          where: { ownerType, ownerId: ownerId ?? null },
        });
        if (again) return this.toPublic(again);
      }
      throw err;
    }
  }

  // ============================================================
  async getMine(userId: string): Promise<WalletWithEntries> {
    const wallet = await this.getOrCreate('user', userId);
    const entries = await this.db.walletEntry.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { wallet, entries: entries.map((e) => this.toPublicEntry(e)) };
  }

  // ============================================================
  // Double-entry transfer.
  // Pass an array of legs; the service writes them atomically.
  // Each leg: {walletId, direction, amountPaise, bucket?, reason, meta?}
  // Validates sum(D) == sum(C). Updates each wallet's balance/pending.
  // ============================================================
  async transfer(
    legs: Array<{
      walletId: string;
      direction: 'D' | 'C';
      amountPaise: number;
      bucket?: Bucket;
      reason: string;
      meta?: Record<string, unknown>;
    }>,
  ): Promise<{ txnId: string }> {
    if (legs.length < 2) {
      throw new BadRequestException('transfer needs at least two legs');
    }
    const debits = legs.filter((l) => l.direction === 'D').reduce((s, l) => s + l.amountPaise, 0);
    const credits = legs.filter((l) => l.direction === 'C').reduce((s, l) => s + l.amountPaise, 0);
    if (debits !== credits) {
      throw new BadRequestException(
        `unbalanced transfer: sum(D)=${debits} vs sum(C)=${credits}`,
      );
    }
    for (const l of legs) {
      if (l.amountPaise <= 0 || !Number.isInteger(l.amountPaise)) {
        throw new BadRequestException(`leg amount must be a positive integer (got ${l.amountPaise})`);
      }
    }

    const txnId = randomUUID();

    await this.db.$transaction(async (tx) => {
      // 1. Insert ledger entries.
      await tx.walletEntry.createMany({
        data: legs.map((l) => ({
          walletId: l.walletId,
          txnId,
          direction: l.direction,
          amountPaise: l.amountPaise,
          bucket: l.bucket ?? 'available',
          reason: l.reason,
          meta: (l.meta ?? {}) as Prisma.InputJsonValue,
        })),
      });

      // 2. Update materialised balances per wallet.
      // Group legs by wallet so we issue at most one UPDATE per wallet.
      const perWallet = new Map<
        string,
        { availableDelta: number; pendingDelta: number }
      >();
      for (const l of legs) {
        const acc = perWallet.get(l.walletId) ?? { availableDelta: 0, pendingDelta: 0 };
        const sign = l.direction === 'C' ? 1 : -1;
        if ((l.bucket ?? 'available') === 'available') {
          acc.availableDelta += sign * l.amountPaise;
        } else {
          acc.pendingDelta += sign * l.amountPaise;
        }
        perWallet.set(l.walletId, acc);
      }
      for (const [walletId, deltas] of perWallet) {
        await tx.wallet.update({
          where: { id: walletId },
          data: {
            balancePaise: { increment: deltas.availableDelta },
            pendingPaise: { increment: deltas.pendingDelta },
          },
        });
      }
    });

    this.log.log(`Transfer ${txnId} (${legs.length} legs, ₹${debits / 100})`);
    return { txnId };
  }

  // ============================================================
  // Reconciliation check — sum across the ledger.
  // Used by the /wallet/_audit endpoint and a future nightly job.
  // ============================================================
  async ledgerInvariant(): Promise<{ debitsPaise: number; creditsPaise: number; balanced: boolean }> {
    const result = await this.db.$queryRaw<
      Array<{ debits: bigint; credits: bigint }>
    >`
      SELECT
        COALESCE(SUM(amount_paise) FILTER (WHERE direction = 'D'), 0)::bigint AS debits,
        COALESCE(SUM(amount_paise) FILTER (WHERE direction = 'C'), 0)::bigint AS credits
      FROM wallet_entries
    `;
    const debits = Number(result[0]?.debits ?? 0);
    const credits = Number(result[0]?.credits ?? 0);
    return { debitsPaise: debits, creditsPaise: credits, balanced: debits === credits };
  }

  // ============================================================
  // helpers
  // ============================================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toPublic(w: any): PublicWallet {
    return {
      id: w.id,
      ownerType: w.ownerType,
      ownerId: w.ownerId,
      currency: w.currency,
      balancePaise: w.balancePaise,
      pendingPaise: w.pendingPaise,
      createdAt: w.createdAt.toISOString(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toPublicEntry(e: any): PublicWalletEntry {
    return {
      id: e.id,
      walletId: e.walletId,
      txnId: e.txnId,
      direction: e.direction,
      amountPaise: e.amountPaise,
      reason: e.reason,
      bucket: e.bucket,
      meta: e.meta,
      createdAt: e.createdAt.toISOString(),
    };
  }

  // ============================================================
  // Sparkline — daily running balance series for the last N days.
  // Powers the small charts on the dashboard.
  // ============================================================
  async sparkline(
    userId: string,
    days = 30,
  ): Promise<{ points: Array<{ date: string; balance: number }> }> {
    const wallet = await this.db.wallet.findFirst({
      where: { ownerType: 'user', ownerId: userId },
    });
    if (!wallet) return { points: [] };

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - days);

    // Aggregate net change per day, then accumulate.
    const rows = await this.db.$queryRaw<Array<{ day: Date; net: bigint }>>`
      SELECT
        DATE_TRUNC('day', created_at) AS day,
        SUM(CASE WHEN direction = 'C' THEN amount_paise ELSE -amount_paise END)::bigint AS net
      FROM wallet_entries
      WHERE wallet_id = ${wallet.id}::uuid
        AND created_at >= ${start}
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY day ASC
    `;

    // Walk forward from the (current_balance - sum_of_changes_in_range) baseline.
    const totalNet = rows.reduce((s, r) => s + Number(r.net), 0);
    let running = wallet.balancePaise - totalNet;

    const byDay = new Map<string, number>();
    for (const r of rows) {
      running += Number(r.net);
      const key = r.day.toISOString().slice(0, 10);
      byDay.set(key, running);
    }

    // Fill missing days (no entries) with the prior day's value.
    const points: Array<{ date: string; balance: number }> = [];
    let last = wallet.balancePaise - totalNet;
    for (let i = 0; i <= days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      if (byDay.has(key)) last = byDay.get(key)!;
      points.push({ date: key, balance: last / 100 });
    }
    return { points };
  }

  // ============================================================
  // Breakdown — wallet entries grouped by reason for the current month.
  // Powers the Earnings Overview donut chart.
  // ============================================================
  async breakdown(
    userId: string,
  ): Promise<{
    totalPaise: number;
    categories: Array<{ reason: string; amountPaise: number; pct: number }>;
  }> {
    const wallet = await this.db.wallet.findFirst({
      where: { ownerType: 'user', ownerId: userId },
    });
    if (!wallet) return { totalPaise: 0, categories: [] };

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const rows = await this.db.$queryRaw<Array<{ reason: string; total: bigint }>>`
      SELECT
        reason,
        SUM(amount_paise)::bigint AS total
      FROM wallet_entries
      WHERE wallet_id = ${wallet.id}::uuid
        AND direction = 'C'
        AND created_at >= ${monthStart}
      GROUP BY reason
      ORDER BY total DESC
    `;

    const total = rows.reduce((s, r) => s + Number(r.total), 0);
    const categories = rows.map((r) => ({
      reason: r.reason,
      amountPaise: Number(r.total),
      pct: total > 0 ? Math.round((Number(r.total) / total) * 100) : 0,
    }));
    return { totalPaise: total, categories };
  }
}
