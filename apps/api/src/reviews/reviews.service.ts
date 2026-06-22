import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  CreateReviewDto,
  EventReviewsSummary,
  ListReviewsQuery,
  PublicReview,
} from './dto/review.dto';

// Bayesian shrinkage constants (master doc §3.9.2).
// avg_shrunk = (C * m + sum) / (C + n)
const BAYES_C = 10;
const BAYES_M = 4.2;

@Injectable()
export class ReviewsService {
  private readonly log = new Logger(ReviewsService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly cache: CacheService,
  ) {}

  // ============================================================
  // POST /events/:eventId/reviews — author leaves a review
  // ============================================================
  async create(
    userId: string,
    eventSlug: string,
    input: CreateReviewDto,
  ): Promise<{ review: PublicReview; summary: EventReviewsSummary }> {
    const event = await this.db.event.findUnique({
      where: { slug: eventSlug },
      select: {
        id: true,
        organiserId: true,
        status: true,
        slug: true,
        title: true,
        organiser: { select: { userId: true } },
      },
    });
    if (!event || event.status !== 'live') {
      throw new NotFoundException({ code: 'event_not_found' });
    }

    // Any signed-in user can submit one review per event (uniqueness enforced
    // by the (authorId, eventId) unique index, caught as P2002 below). The
    // only carve-out is the event's own organiser, who can't review their
    // own event (standard marketplace anti-conflict-of-interest rule).
    if (event.organiser.userId === userId) {
      throw new ForbiddenException({
        code: 'own_event',
        message: "You can't review your own event.",
      });
    }

    let row;
    try {
      row = await this.db.review.create({
        data: {
          authorId: userId,
          eventId: event.id,
          stars: input.stars,
          body: input.body ?? null,
        },
        include: {
          author: { select: { phoneE164: true, displayName: true } },
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({
          code: 'already_reviewed',
          message: 'You already reviewed this event. (Edit is coming later.)',
        });
      }
      throw err;
    }

    // Recompute the organiser's avg_rating from all their events' reviews.
    await this.recomputeOrganiserRating(event.organiserId);

    // Bust the events list + discover caches so the new rating shows up
    // immediately on every public surface, not after the 30s TTL.
    await Promise.all([
      this.cache.invalidatePrefix('events:list:'),
      this.cache.invalidatePrefix('events:discover:'),
    ]).catch(() => {
      /* cache failures are non-fatal */
    });

    // Notify the organiser (best-effort, fire and forget).
    if (event.organiser.userId !== userId) {
      void this.notifications.create({
        userId: event.organiser.userId,
        type: 'review_received',
        title: `New ${input.stars}★ review: ${event.title}`,
        body: input.body
          ? input.body.slice(0, 200) + (input.body.length > 200 ? '…' : '')
          : `Someone left a ${input.stars}-star review.`,
        link: `/events/${event.slug}`,
        meta: { eventId: event.id, stars: input.stars, reviewId: row.id, type: 'review_received' },
      });
    }

    const summary = await this.eventSummary(event.id);
    return { review: this.toPublic(row), summary };
  }

  // ============================================================
  // GET /events/:slug/reviews — paginated, newest first
  // ============================================================
  async list(
    eventSlug: string,
    query: ListReviewsQuery,
  ): Promise<{ items: PublicReview[]; summary: EventReviewsSummary; nextCursor: string | null }> {
    const event = await this.db.event.findUnique({
      where: { slug: eventSlug },
      select: { id: true },
    });
    if (!event) throw new NotFoundException({ code: 'event_not_found' });

    const rows = await this.db.review.findMany({
      where: { eventId: event.id, moderationStatus: 'approved' },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        author: { select: { phoneE164: true, displayName: true } },
      },
    });
    const hasMore = rows.length > query.limit;
    const sliced = hasMore ? rows.slice(0, query.limit) : rows;
    const items = sliced.map((r) => this.toPublic(r));
    const nextCursor = hasMore ? sliced[sliced.length - 1].id : null;

    const summary = await this.eventSummary(event.id);
    return { items, summary, nextCursor };
  }

  // ============================================================
  // listForOrganiser — newest reviews across all the organiser's events (Step 7c)
  // Each item carries the event slug + title so the UI can link back.
  // ============================================================
  async listForOrganiser(organiserId: string, limit = 20): Promise<
    Array<
      PublicReview & {
        event: { slug: string; title: string };
      }
    >
  > {
    const rows = await this.db.review.findMany({
      where: {
        moderationStatus: 'approved',
        event: { organiserId },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        author: { select: { phoneE164: true, displayName: true } },
        event: { select: { slug: true, title: true } },
      },
    });
    return rows.map((r) => ({
      ...this.toPublic(r),
      event: { slug: r.event.slug, title: r.event.title },
    }));
  }

  // ============================================================
  // organiserSummary — aggregate stats across the organiser's reviews (Step 7c)
  // ============================================================
  async organiserSummary(organiserId: string): Promise<EventReviewsSummary> {
    type Row = { stars: number; count: bigint };
    const histRows = await this.db.$queryRaw<Row[]>(Prisma.sql`
      SELECT r.stars, COUNT(*)::bigint AS count
      FROM reviews r
      JOIN events e ON e.id = r.event_id
      WHERE e.organiser_id = ${organiserId}::uuid
        AND r.moderation_status = 'approved'
      GROUP BY r.stars
    `);

    const histogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as EventReviewsSummary['histogram'];
    let sum = 0;
    let count = 0;
    for (const row of histRows) {
      const s = row.stars;
      const c = Number(row.count);
      if (s >= 1 && s <= 5) histogram[s as 1 | 2 | 3 | 4 | 5] = c;
      sum += s * c;
      count += c;
    }

    const average = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
    const bayesian =
      count > 0
        ? Math.round(((BAYES_C * BAYES_M + sum) / (BAYES_C + count)) * 100) / 100
        : BAYES_M;
    return { count, average, bayesian, histogram };
  }

  // ============================================================
  // Summary used by both list + create endpoints.
  // ============================================================
  async eventSummary(eventId: string): Promise<EventReviewsSummary> {
    type Row = { stars: number; count: bigint };
    const histRows = await this.db.$queryRaw<Row[]>(Prisma.sql`
      SELECT stars, COUNT(*)::bigint AS count
      FROM reviews
      WHERE event_id = ${eventId}::uuid AND moderation_status = 'approved'
      GROUP BY stars
    `);

    const histogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as EventReviewsSummary['histogram'];
    let sum = 0;
    let count = 0;
    for (const row of histRows) {
      const s = row.stars;
      const c = Number(row.count);
      if (s >= 1 && s <= 5) {
        histogram[s as 1 | 2 | 3 | 4 | 5] = c;
      }
      sum += s * c;
      count += c;
    }

    const average = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
    const bayesian =
      count > 0
        ? Math.round(((BAYES_C * BAYES_M + sum) / (BAYES_C + count)) * 100) / 100
        : BAYES_M;

    return { count, average, bayesian, histogram };
  }

  // ============================================================
  // Recompute organiser's avg_rating across every approved review on every
  // event they own. We store the raw mean (sum/count) here so the same number
  // shows on the event card, profile chip, and Reviews page — users get
  // confused when a 5-star review renders as 4.27 because of Bayesian
  // shrinkage. The bayesian field on the per-organiser summary endpoint is
  // still computed for any future ranking use.
  // ============================================================
  private async recomputeOrganiserRating(organiserId: string): Promise<void> {
    await this.db.$executeRaw(Prisma.sql`
      UPDATE "business_profiles"
      SET "avg_rating" = COALESCE((
        SELECT ROUND(AVG(r.stars)::numeric, 2)
        FROM reviews r
        JOIN events e ON e.id = r.event_id
        WHERE e.organiser_id = ${organiserId}::uuid
          AND r.moderation_status = 'approved'
      ), 0)
      WHERE id = ${organiserId}::uuid
    `);
  }

  // ============================================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toPublic(row: any): PublicReview {
    return {
      id: row.id,
      stars: row.stars,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      author: { label: this.authorLabel(row.author) },
    };
  }

  private authorLabel(author: { phoneE164: string | null; displayName: string | null }): string {
    if (author.displayName) return author.displayName;
    if (author.phoneE164) {
      const last4 = author.phoneE164.slice(-4);
      return `User ${last4}`;
    }
    return 'Anonymous';
  }
}
