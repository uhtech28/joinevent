import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import type {
  PublicPlan,
  PublicSubscription,
  SubscribeDto,
} from './dto/subscription.dto';

const SEED_PLANS = [
  {
    code: 'society_plus',
    name: 'Society Plus',
    pricePaise: 99_00,
    benefits: [
      'Priority event booking',
      'Family wallet (up to 4 members)',
      'Exclusive society events',
      'Early access to new features',
    ],
  },
  {
    code: 'vendor_plus',
    name: 'Vendor Plus',
    pricePaise: 499_00,
    benefits: [
      'Lite POS for events',
      'Customer CRM with re-targeting',
      'Route planner across events',
      'Premium analytics',
    ],
  },
  {
    code: 'organiser_pro',
    name: 'Organiser Pro',
    pricePaise: 2_000_00,
    benefits: [
      'Multi-event campaigns',
      'Unlimited featured boosts',
      'Sponsor matchmaking',
      'Advanced analytics + exports',
    ],
  },
];

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  private readonly log = new Logger(SubscriptionsService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  async onModuleInit() {
    // Seed the three plans on first boot.
    for (const p of SEED_PLANS) {
      await this.db.subscriptionPlan.upsert({
        where: { code: p.code },
        update: { name: p.name, pricePaise: p.pricePaise, benefits: p.benefits },
        create: {
          code: p.code,
          name: p.name,
          pricePaise: p.pricePaise,
          billingCycle: 'monthly',
          benefits: p.benefits,
        },
      });
    }
    this.log.log(`Subscription plans seeded (${SEED_PLANS.length})`);
  }

  async listPlans(): Promise<PublicPlan[]> {
    const rows = await this.db.subscriptionPlan.findMany({ orderBy: { pricePaise: 'asc' } });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      pricePaise: r.pricePaise,
      billingCycle: r.billingCycle,
      benefits: (r.benefits as string[]) ?? [],
    }));
  }

  async mine(userId: string): Promise<PublicSubscription[]> {
    const rows = await this.db.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
    return rows.map((r) => ({
      id: r.id,
      planCode: r.plan.code,
      planName: r.plan.name,
      status: r.status,
      startedAt: r.startedAt.toISOString(),
      nextBillingAt: r.nextBillingAt.toISOString(),
      cancelledAt: r.cancelledAt ? r.cancelledAt.toISOString() : null,
    }));
  }

  async subscribe(
    userId: string,
    input: SubscribeDto,
  ): Promise<{ subscription: PublicSubscription; newWalletBalancePaise: number }> {
    const plan = await this.db.subscriptionPlan.findUnique({ where: { code: input.planCode } });
    if (!plan) throw new NotFoundException({ code: 'plan_not_found' });

    const existing = await this.db.subscription.findFirst({
      where: { userId, planId: plan.id, status: { in: ['active', 'past_due'] } },
    });
    if (existing) {
      throw new ConflictException({
        code: 'already_subscribed',
        message: 'You are already subscribed to this plan.',
      });
    }

    const userWallet = await this.wallet.getOrCreate('user', userId);
    if (userWallet.balancePaise < plan.pricePaise) {
      throw new BadRequestException({
        code: 'insufficient_funds',
        message: `Need ₹${(plan.pricePaise / 100).toLocaleString('en-IN')} in your wallet for the first month.`,
      });
    }

    const house = await this.wallet.getOrCreate('platform', null);
    await this.wallet.transfer([
      {
        walletId: userWallet.id,
        direction: 'D',
        amountPaise: plan.pricePaise,
        reason: 'commission',
        meta: { kind: 'subscription', planCode: plan.code },
      },
      {
        walletId: house.id,
        direction: 'C',
        amountPaise: plan.pricePaise,
        reason: 'commission',
        meta: { kind: 'subscription', planCode: plan.code },
      },
    ]);

    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    const created = await this.db.subscription.create({
      data: {
        userId,
        planId: plan.id,
        status: 'active',
        nextBillingAt: next,
      },
      include: { plan: true },
    });

    const fresh = await this.wallet.getOrCreate('user', userId);
    return {
      subscription: {
        id: created.id,
        planCode: created.plan.code,
        planName: created.plan.name,
        status: created.status,
        startedAt: created.startedAt.toISOString(),
        nextBillingAt: created.nextBillingAt.toISOString(),
        cancelledAt: null,
      },
      newWalletBalancePaise: fresh.balancePaise,
    };
  }

  async cancel(userId: string, id: string): Promise<{ ok: true }> {
    const sub = await this.db.subscription.findUnique({ where: { id } });
    if (!sub || sub.userId !== userId) throw new NotFoundException({ code: 'not_found' });
    if (sub.status === 'cancelled') throw new BadRequestException({ code: 'already_cancelled' });
    await this.db.subscription.update({
      where: { id },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });
    return { ok: true };
  }
}
