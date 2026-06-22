import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { TIERS, type BoostDto, type PublicFeatured, type Tier } from './dto/featured.dto';

@Injectable()
export class FeaturedService {
  private readonly log = new Logger(FeaturedService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  // POST /events/:id/boost — organiser pays from wallet to feature.
  async boost(
    userId: string,
    eventId: string,
    input: BoostDto,
  ): Promise<{ featured: PublicFeatured; newWalletBalancePaise: number }> {
    const event = await this.db.event.findUnique({
      where: { id: eventId },
      include: {
        organiser: { select: { userId: true } },
        society: { select: { city: true } },
      },
    });
    if (!event) throw new NotFoundException({ code: 'event_not_found' });
    if (event.organiser.userId !== userId) {
      throw new ForbiddenException({ code: 'not_owner' });
    }
    if (event.status !== 'live') {
      throw new BadRequestException({ code: 'event_not_live' });
    }
    // Disallow overlapping featured (idempotency).
    const active = await this.db.featuredListing.findFirst({
      where: { eventId, endsAt: { gt: new Date() } },
    });
    if (active) {
      throw new ConflictException({
        code: 'already_featured',
        message: 'This event already has an active feature.',
      });
    }

    // CLOSEOUT: per master doc §19.3, "Inventory is capped per geo per day to
    // preserve user trust." We cap at most ONE `city` tier per city per day,
    // and 5 boost/spotlight per society per day.
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay.getTime() + 86400 * 1000);
    // FeaturedListing has no relation back to Event in the schema, so we
    // gather candidate event IDs first and use eventId IN (…) for the count.
    if (input.tier === 'city' && event.society) {
      const cityEventIds = await this.db.event.findMany({
        where: { society: { city: event.society.city } },
        select: { id: true },
      });
      const sameCityToday = await this.db.featuredListing.count({
        where: {
          tier: 'city',
          startsAt: { gte: startOfDay, lt: endOfDay },
          eventId: { in: cityEventIds.map((e) => e.id) },
        },
      });
      if (sameCityToday >= 1) {
        throw new ConflictException({
          code: 'city_tier_capped',
          message: 'A City Feature is already active in this city today.',
        });
      }
    }
    if (input.tier !== 'city' && event.societyId) {
      const societyEventIds = await this.db.event.findMany({
        where: { societyId: event.societyId },
        select: { id: true },
      });
      const sameSocietyToday = await this.db.featuredListing.count({
        where: {
          tier: { in: ['boost', 'spotlight'] },
          startsAt: { gte: startOfDay, lt: endOfDay },
          eventId: { in: societyEventIds.map((e) => e.id) },
        },
      });
      if (sameSocietyToday >= 5) {
        throw new ConflictException({
          code: 'society_tier_capped',
          message: 'Maximum of 5 featured listings per society per day.',
        });
      }
    }

    const tierInfo = TIERS[input.tier as Tier];
    const userWallet = await this.wallet.getOrCreate('user', userId);
    if (userWallet.balancePaise < tierInfo.pricePaise) {
      throw new BadRequestException({
        code: 'insufficient_funds',
        message: `Need ₹${(tierInfo.pricePaise / 100).toLocaleString('en-IN')} in your wallet.`,
      });
    }

    const house = await this.wallet.getOrCreate('platform', null);
    const { txnId } = await this.wallet.transfer([
      {
        walletId: userWallet.id,
        direction: 'D',
        amountPaise: tierInfo.pricePaise,
        reason: 'commission',
        meta: { kind: 'featured', tier: input.tier, eventId },
      },
      {
        walletId: house.id,
        direction: 'C',
        amountPaise: tierInfo.pricePaise,
        reason: 'commission',
        meta: { kind: 'featured', tier: input.tier, eventId },
      },
    ]);

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + tierInfo.durationDays * 86400 * 1000);
    const row = await this.db.featuredListing.create({
      data: {
        eventId,
        tier: input.tier,
        pricePaise: tierInfo.pricePaise,
        startsAt,
        endsAt,
        txnId,
      },
    });

    const fresh = await this.wallet.getOrCreate('user', userId);
    return {
      featured: this.toPublic(row),
      newWalletBalancePaise: fresh.balancePaise,
    };
  }

  async listActive(): Promise<PublicFeatured[]> {
    const rows = await this.db.featuredListing.findMany({
      where: { endsAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toPublic(r));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toPublic(r: any): PublicFeatured {
    return {
      id: r.id,
      eventId: r.eventId,
      tier: r.tier as Tier,
      pricePaise: r.pricePaise,
      startsAt: r.startsAt.toISOString(),
      endsAt: r.endsAt.toISOString(),
      active: r.endsAt > new Date(),
      createdAt: r.createdAt.toISOString(),
    };
  }
}
