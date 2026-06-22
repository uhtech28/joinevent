import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  PublicWithdrawal,
  RequestWithdrawalDto,
  DecideWithdrawalDto,
} from './dto/withdrawal.dto';

const WITHDRAW_FEE_PAISE = 500; // ₹5 flat

@Injectable()
export class WithdrawalsService {
  private readonly log = new Logger(WithdrawalsService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly wallet: WalletService,
    private readonly notifications: NotificationsService,
  ) {}

  // ============================================================
  // POST /wallet/withdraw — user requests a payout to bank.
  // We immediately hold the funds (move available → pending bucket) so they
  // can't be double-spent. Admin approves → released to PSP queue; reject → restored.
  // ============================================================
  async request(userId: string, input: RequestWithdrawalDto): Promise<PublicWithdrawal> {
    // Block if there's already a pending withdrawal — one at a time.
    const existing = await this.db.withdrawalRequest.findFirst({
      where: { userId, status: 'pending' },
    });
    if (existing) {
      throw new ConflictException({
        code: 'pending_exists',
        message: 'You already have a pending withdrawal',
      });
    }

    const userWallet = await this.wallet.getOrCreate('user', userId);
    const totalDebit = input.amountPaise + WITHDRAW_FEE_PAISE;
    if (userWallet.balancePaise < totalDebit) {
      throw new BadRequestException({
        code: 'insufficient_funds',
        message: `Need ₹${(totalDebit / 100).toLocaleString('en-IN')} (incl. ₹5 fee).`,
      });
    }

    // Move money: available → pending on user wallet (hold).
    // Fee moves available → house immediately.
    await this.wallet.transfer([
      {
        walletId: userWallet.id,
        direction: 'D',
        amountPaise: totalDebit,
        reason: 'withdrawal',
        meta: { side: 'user_debit' },
      },
      {
        walletId: userWallet.id,
        direction: 'C',
        amountPaise: input.amountPaise,
        bucket: 'pending',
        reason: 'withdrawal',
        meta: { side: 'user_hold' },
      },
      {
        walletId: (await this.wallet.getOrCreate('platform', null)).id,
        direction: 'C',
        amountPaise: WITHDRAW_FEE_PAISE,
        reason: 'commission',
        meta: { side: 'withdrawal_fee' },
      },
    ]);

    const row = await this.db.withdrawalRequest.create({
      data: {
        userId,
        amountPaise: input.amountPaise,
        feePaise: WITHDRAW_FEE_PAISE,
        bankAccountRef: input.bankAccountRef,
        ifsc: input.ifsc,
        accountHolder: input.accountHolder,
        note: input.note ?? null,
        status: 'pending',
      },
    });

    return this.toPublic(row);
  }

  async listMine(userId: string): Promise<PublicWithdrawal[]> {
    const rows = await this.db.withdrawalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return rows.map((r) => this.toPublic(r));
  }

  // Admin queue
  async listPending(): Promise<Array<PublicWithdrawal & { userLabel: string }>> {
    const rows = await this.db.withdrawalRequest.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });
    // resolve user label
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const users = await this.db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, phoneE164: true, displayName: true },
    });
    const labels = new Map(
      users.map((u) => [
        u.id,
        u.displayName ?? (u.phoneE164 ? `User ${u.phoneE164.slice(-4)}` : 'User'),
      ]),
    );
    return rows.map((r) => ({ ...this.toPublic(r), userLabel: labels.get(r.userId) ?? 'User' }));
  }

  // Admin decision
  async decide(
    adminUserId: string,
    id: string,
    input: DecideWithdrawalDto,
  ): Promise<{ ok: true }> {
    const row = await this.db.withdrawalRequest.findUnique({ where: { id } });
    if (!row) throw new NotFoundException({ code: 'not_found' });
    if (row.status !== 'pending') {
      throw new BadRequestException({ code: 'not_pending', message: `Already ${row.status}` });
    }

    const userWallet = await this.wallet.getOrCreate('user', row.userId);
    const house = await this.wallet.getOrCreate('platform', null);

    if (input.approve) {
      // Release: move pending → house. Money is now "out" of platform.
      const { txnId } = await this.wallet.transfer([
        {
          walletId: userWallet.id,
          direction: 'D',
          amountPaise: row.amountPaise,
          bucket: 'pending',
          reason: 'withdrawal',
          meta: { withdrawalId: id, side: 'user_release' },
        },
        {
          walletId: house.id,
          direction: 'C',
          amountPaise: row.amountPaise,
          reason: 'withdrawal',
          meta: { withdrawalId: id, side: 'house_credit' },
        },
      ]);
      await this.db.withdrawalRequest.update({
        where: { id },
        data: {
          status: 'approved',
          decidedById: adminUserId,
          decidedAt: new Date(),
          note: input.note ?? row.note,
          txnId,
        },
      });
      // Also write audit log
      await this.db.adminAuditLog.create({
        data: {
          actorId: adminUserId,
          action: 'approve_withdrawal',
          targetTable: 'withdrawal_requests',
          targetId: id,
          diff: { status: ['pending', 'approved'], amountPaise: row.amountPaise },
          note: input.note ?? null,
        },
      });
      void this.notifications.create({
        userId: row.userId,
        type: 'kyc_approved', // reuse icon set
        title: 'Withdrawal approved',
        body: `Your withdrawal of ₹${(row.amountPaise / 100).toLocaleString('en-IN')} has been queued for payout.`,
        link: '/dashboard/wallet',
        meta: { withdrawalId: id },
      });
    } else {
      // Reject: restore funds available, refund fee.
      await this.wallet.transfer([
        {
          walletId: userWallet.id,
          direction: 'D',
          amountPaise: row.amountPaise,
          bucket: 'pending',
          reason: 'refund',
          meta: { withdrawalId: id, side: 'user_release' },
        },
        {
          walletId: userWallet.id,
          direction: 'C',
          amountPaise: row.amountPaise + row.feePaise,
          reason: 'refund',
          meta: { withdrawalId: id, side: 'user_restore' },
        },
        {
          walletId: house.id,
          direction: 'D',
          amountPaise: row.feePaise,
          reason: 'refund',
          meta: { withdrawalId: id, side: 'fee_refund' },
        },
      ]);
      await this.db.withdrawalRequest.update({
        where: { id },
        data: {
          status: 'rejected',
          decidedById: adminUserId,
          decidedAt: new Date(),
          note: input.note ?? row.note,
        },
      });
      await this.db.adminAuditLog.create({
        data: {
          actorId: adminUserId,
          action: 'reject_withdrawal',
          targetTable: 'withdrawal_requests',
          targetId: id,
          diff: { status: ['pending', 'rejected'], amountPaise: row.amountPaise },
          note: input.note ?? null,
        },
      });
      void this.notifications.create({
        userId: row.userId,
        type: 'kyc_rejected',
        title: 'Withdrawal rejected',
        body:
          input.note ??
          'Your withdrawal request was rejected. Funds have been returned to your wallet.',
        link: '/dashboard/wallet',
        meta: { withdrawalId: id },
      });
    }

    return { ok: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toPublic(r: any): PublicWithdrawal {
    return {
      id: r.id,
      userId: r.userId,
      amountPaise: r.amountPaise,
      feePaise: r.feePaise,
      status: r.status,
      bankAccountRef: r.bankAccountRef,
      ifsc: r.ifsc,
      accountHolder: r.accountHolder,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
    };
  }
}
