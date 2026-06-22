import {
  Global,
  Injectable,
  Logger,
  Module,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Queue, QueueEvents, Worker } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { loadEnv } from '../env';

/**
 * Bull workers (CLOSEOUT).
 *
 * Two repeatable jobs:
 *   - escrow-release       runs every hour. Moves organiser pending → available
 *                          for bookings whose event ended ≥ 1 day ago.
 *   - subscription-billing runs every hour. Charges due subscriptions, marks
 *                          past_due on insufficient funds, advances next_billing_at.
 */
@Injectable()
export class QueueRunner implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(QueueRunner.name);
  private queue?: Queue;
  private worker?: Worker;
  private events?: QueueEvents;

  constructor(
    private readonly db: PrismaService,
    private readonly wallet: WalletService,
    private readonly notifications: NotificationsService,
  ) {}

  async onModuleInit() {
    // CLOSEOUT: Bull workers are optional. If Redis is unreachable or
    // the runtime has an issue (e.g. Node 24 + libuv on Windows), we log
    // and skip — the rest of the API continues to work. Escrow release
    // and subscription billing can run as a separate cron job in prod.
    if (process.env.QUEUE_DISABLED === 'true') {
      this.log.warn('QUEUE_DISABLED=true — Bull workers skipped');
      return;
    }

    try {
      const env = loadEnv();
      const connection = { url: env.REDIS_URL };

      this.queue = new Queue('joinevents-cron', { connection });

      await this.queue.add(
        'escrow-release',
        {},
        {
          jobId: 'escrow-release-cron',
          repeat: { every: 60 * 60 * 1000 },
          removeOnComplete: true,
          removeOnFail: 50,
        },
      );
      await this.queue.add(
        'subscription-billing',
        {},
        {
          jobId: 'subscription-billing-cron',
          repeat: { every: 60 * 60 * 1000 },
          removeOnComplete: true,
          removeOnFail: 50,
        },
      );

      this.worker = new Worker(
        'joinevents-cron',
        async (job) => {
          if (job.name === 'escrow-release') return this.releaseEscrow();
          if (job.name === 'subscription-billing') return this.billSubscriptions();
        },
        { connection },
      );
      this.worker.on('failed', (job, err) =>
        this.log.warn(`Job ${job?.name} failed: ${err.message}`),
      );
      this.worker.on('error', (err) => {
        this.log.warn(`Worker error: ${err.message}`);
      });

      this.log.log('Bull workers running (escrow-release, subscription-billing)');
    } catch (err) {
      this.log.warn(
        `Bull init failed; continuing without scheduled jobs: ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    try {
      await this.worker?.close();
    } catch {}
    try {
      await this.queue?.close();
    } catch {}
    try {
      await this.events?.close();
    } catch {}
  }

  // ============================================================
  // Escrow release T+1 (master doc §3.7.3)
  // ============================================================
  async releaseEscrow(): Promise<{ released: number }> {
    const cutoff = new Date(Date.now() - 86400 * 1000);
    const candidates = await this.db.booking.findMany({
      where: {
        status: 'confirmed',
        releasedAt: null,
        stall: { event: { endsAt: { lt: cutoff } } },
      },
      include: {
        stall: { include: { event: { include: { organiser: { select: { id: true, userId: true } } } } } },
      },
      take: 100,
    });

    let released = 0;
    for (const b of candidates) {
      try {
        const organiserWallet = await this.wallet.getOrCreate(
          'business',
          b.stall.event.organiser.id,
        );
        // Move escrow_held_paise from pending → available on organiser wallet.
        await this.wallet.transfer([
          {
            walletId: organiserWallet.id,
            direction: 'D',
            amountPaise: b.escrowHeldPaise,
            bucket: 'pending',
            reason: 'stall_booking',
            meta: { bookingId: b.id, kind: 'escrow_release_debit' },
          },
          {
            walletId: organiserWallet.id,
            direction: 'C',
            amountPaise: b.escrowHeldPaise,
            reason: 'stall_booking',
            meta: { bookingId: b.id, kind: 'escrow_release_credit' },
          },
        ]);
        await this.db.booking.update({
          where: { id: b.id },
          data: { status: 'released', releasedAt: new Date() },
        });
        // Notify organiser
        void this.notifications.create({
          userId: b.stall.event.organiser.userId,
          type: 'booking_received',
          title: `Escrow released: ${b.stall.event.title}`,
          body: `₹${(b.escrowHeldPaise / 100).toLocaleString('en-IN')} from a stall booking is now in your available balance.`,
          link: '/dashboard/wallet',
          meta: { bookingId: b.id, kind: 'escrow_released' },
        });
        released++;
      } catch (err) {
        this.log.warn(`Escrow release failed for booking ${b.id}: ${(err as Error).message}`);
      }
    }
    if (released > 0) this.log.log(`Released escrow for ${released} bookings`);
    return { released };
  }

  // ============================================================
  // Subscription billing (master doc §19.6)
  // ============================================================
  async billSubscriptions(): Promise<{ billed: number; pastDue: number }> {
    const due = await this.db.subscription.findMany({
      where: { status: 'active', nextBillingAt: { lte: new Date() } },
      include: { plan: true },
      take: 200,
    });

    const house = await this.wallet.getOrCreate('platform', null);
    let billed = 0;
    let pastDue = 0;

    for (const sub of due) {
      try {
        const userWallet = await this.wallet.getOrCreate('user', sub.userId);
        if (userWallet.balancePaise < sub.plan.pricePaise) {
          await this.db.subscription.update({
            where: { id: sub.id },
            data: { status: 'past_due' },
          });
          void this.notifications.create({
            userId: sub.userId,
            type: 'kyc_rejected',
            title: `${sub.plan.name} — payment failed`,
            body: `We couldn't charge your wallet ₹${(sub.plan.pricePaise / 100).toLocaleString('en-IN')}. Top up to resume your subscription.`,
            link: '/dashboard/wallet',
          });
          pastDue++;
          continue;
        }
        await this.wallet.transfer([
          {
            walletId: userWallet.id,
            direction: 'D',
            amountPaise: sub.plan.pricePaise,
            reason: 'commission',
            meta: { kind: 'subscription', planCode: sub.plan.code, subscriptionId: sub.id },
          },
          {
            walletId: house.id,
            direction: 'C',
            amountPaise: sub.plan.pricePaise,
            reason: 'commission',
            meta: { kind: 'subscription', planCode: sub.plan.code, subscriptionId: sub.id },
          },
        ]);
        const next = new Date(sub.nextBillingAt);
        next.setMonth(next.getMonth() + 1);
        await this.db.subscription.update({
          where: { id: sub.id },
          data: { nextBillingAt: next },
        });
        billed++;
      } catch (err) {
        this.log.warn(`Subscription billing failed for ${sub.id}: ${(err as Error).message}`);
      }
    }
    if (billed + pastDue > 0) {
      this.log.log(`Subscriptions: ${billed} billed, ${pastDue} past_due`);
    }
    return { billed, pastDue };
  }
}

@Global()
@Module({
  providers: [QueueRunner],
  exports: [QueueRunner],
})
export class QueueModule {}
