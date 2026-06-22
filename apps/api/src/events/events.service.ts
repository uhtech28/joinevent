import { createHash } from 'crypto';
import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import type { ListEventsQuery } from './dto/list-events.dto';
import type { DiscoverDto } from './dto/discover.dto';
import type { CreateEventDto, UpdateEventDto } from './dto/create-event.dto';

// Short TTL on public read paths — events update during the day (new bookings
// reduce stalls.available, new events get added, featured listings flip).
// 30s strikes the balance: 95%+ cache hit at peak, freshness OK for browse.
const EVENTS_CACHE_TTL_S = 30;
const DISCOVER_CACHE_TTL_S = 30;

// Public DTO shape returned to clients.
// `distanceM` is only set on /discover responses.
// `stallsList` is only set on detail (findBySlug).
export type PublicStall = {
  id: string;
  category: string;
  pricePaise: number;
  available: number;
  booked: number;
  slotsLeft: number;
  facilities: Record<string, unknown>;
};

export type PublicEvent = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImages: string[];
  startsAt: string;
  endsAt: string;
  addressText: string;
  capacity: number | null;
  latitude: number;
  longitude: number;
  metadata: Record<string, unknown>;
  distanceM?: number;
  /** True if this event has an active FeaturedListing (FINAL). */
  isFeatured?: boolean;
  organiser: {
    id?: string;
    username: string;
    displayName: string;
    verified: boolean;
    avgRating: number;
  };
  society: {
    slug: string;
    name: string;
    city: string;
    reputationScore: number;
  } | null;
  stalls: {
    available: number;
    booked: number;
    priceFromPaise: number | null;
  };
  stallsList?: PublicStall[];
};

@Injectable()
export class EventsService {
  private readonly log = new Logger(EventsService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /** Stable hash of a filter object → used as part of the cache key. */
  private filterHash(input: unknown): string {
    return createHash('sha1').update(JSON.stringify(input ?? {})).digest('hex').slice(0, 12);
  }

  // ============================================================
  // List — date-ordered feed (Step 2)
  // FINAL: + category/price/society/verified filters, full-text search,
  // and sort=trending|featured.
  // ============================================================
  async list(query: ListEventsQuery): Promise<{ items: PublicEvent[]; nextCursor: string | null }> {
    // Cache key: filter hash. Same filters across users return cached result.
    // Authenticated personalisation (booked stalls, etc.) must NOT go through here.
    const cacheKey = `events:list:${this.filterHash(query)}`;
    try {
      return await this.cache.wrap(cacheKey, EVENTS_CACHE_TTL_S, () =>
        this.listFromDb(query),
      );
    } catch (err) {
      // Surface the *real* cause so it doesn't get swallowed as a generic 500.
      this.log.error(
        `[events.list] query=${JSON.stringify(query)} failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err;
    }
  }

  private async listFromDb(query: ListEventsQuery): Promise<{ items: PublicEvent[]; nextCursor: string | null }> {
    const { city, limit, cursor, category, societySlug, verifiedOnly, minPricePaise, maxPricePaise, q, sort } = query;

    // Build the where clause incrementally.
    // `endsAt >= now` keeps currently-running ("live now") events visible —
    // we used to filter by `startsAt >= now` which silently hid every event
    // the moment it began, exactly when LIVE attention is highest.
    const where: Prisma.EventWhereInput = {
      status: 'live',
      endsAt: { gte: new Date() },
      ...(city && { society: { city: { equals: city, mode: 'insensitive' } } }),
      ...(societySlug && { society: { slug: societySlug } }),
      ...(verifiedOnly && { organiser: { verified: true } }),
      ...(category && {
        stalls: { some: { category } },
      }),
      ...((minPricePaise != null || maxPricePaise != null) && {
        stalls: {
          some: {
            ...(category ? { category } : {}),
            pricePaise: {
              ...(minPricePaise != null ? { gte: minPricePaise } : {}),
              ...(maxPricePaise != null ? { lte: maxPricePaise } : {}),
            },
          },
        },
      }),
      ...(q && {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { addressText: { contains: q, mode: 'insensitive' } },
        ],
      }),
    };

    // Sort modes
    let orderBy: Prisma.EventOrderByWithRelationInput[] = [
      { startsAt: 'asc' },
      { id: 'asc' },
    ];

    let featuredIds = new Set<string>();
    if (sort === 'featured' || sort === 'trending') {
      // Pull active featured event IDs to boost ranking.
      const featured = await this.db.featuredListing.findMany({
        where: { endsAt: { gt: new Date() } },
        select: { eventId: true },
      });
      featuredIds = new Set(featured.map((f) => f.eventId));
    }
    if (sort === 'trending') {
      // Trending = recency × organiser rating. Plain Prisma orderBy can't do composite,
      // so we sort in app code after the query.
      orderBy = [{ startsAt: 'asc' }];
    }

    // Use primary directly. The PrismaService used to expose a `replicaClient`
    // getter for hot read paths, but Prisma 5's PrismaClient returns a Proxy
    // from its constructor and that Proxy hides any custom subclass getters —
    // `this.db.replicaClient` came back as `undefined` and crashed every call.
    // Read-replica routing can be reintroduced later via a composed client
    // (not a getter on a PrismaClient subclass) once DATABASE_URL_READ_* envs
    // are actually configured.
    const rows = await this.db.event.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy,
      include: {
        organiser: {
          select: { id: true, username: true, displayName: true, verified: true, avgRating: true },
        },
        society: {
          select: { slug: true, name: true, city: true, reputationScore: true },
        },
        stalls: {
          select: { available: true, booked: true, pricePaise: true },
        },
      },
    });

    let ordered = rows;
    if (sort === 'featured' && featuredIds.size > 0) {
      // Featured events float to the top, in date order within each bucket.
      ordered = [
        ...rows.filter((r) => featuredIds.has(r.id)),
        ...rows.filter((r) => !featuredIds.has(r.id)),
      ];
    } else if (sort === 'trending') {
      // Composite score in app code.
      const now = Date.now();
      const dayMs = 86400 * 1000;
      ordered = [...rows].sort((a, b) => {
        const aDays = (new Date(a.startsAt).getTime() - now) / dayMs;
        const bDays = (new Date(b.startsAt).getTime() - now) / dayMs;
        const aRating = Number(a.organiser.avgRating) || 4.2;
        const bRating = Number(b.organiser.avgRating) || 4.2;
        const aFeat = featuredIds.has(a.id) ? 1.5 : 1;
        const bFeat = featuredIds.has(b.id) ? 1.5 : 1;
        // Higher score = nearer date + better rating + featured boost.
        const scoreA = (10 / Math.max(1, aDays)) * (aRating / 5) * aFeat;
        const scoreB = (10 / Math.max(1, bDays)) * (bRating / 5) * bFeat;
        return scoreB - scoreA;
      });
    }

    const hasMore = ordered.length > limit;
    const sliced = hasMore ? ordered.slice(0, limit) : ordered;
    const items = sliced.map((r) => {
      const pub = this.toPublic(r);
      if (featuredIds.has(r.id)) {
        (pub as PublicEvent & { isFeatured?: boolean }).isFeatured = true;
      }
      return pub;
    });
    const nextCursor = hasMore && sort === 'date' ? sliced[sliced.length - 1].id : null;

    return { items, nextCursor };
  }

  // ============================================================
  // Auto-resolve nearest society for an event (FINAL).
  // Returns the seeded society within 3km, or null if none.
  // ============================================================
  async resolveNearestSociety(lat: number, lng: number): Promise<string | null> {
    type Row = { id: string; distance_m: number };
    const rows = await this.db.$queryRaw<Row[]>(Prisma.sql`
      SELECT id::text AS id,
             ST_Distance(
               ST_SetSRID(ST_MakePoint(centroid_lng::float8, centroid_lat::float8), 4326)::geography,
               ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
             )::float AS distance_m
      FROM societies
      WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(centroid_lng::float8, centroid_lat::float8), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        3000
      )
      ORDER BY distance_m ASC
      LIMIT 1
    `);
    return rows[0]?.id ?? null;
  }

  // ============================================================
  // Recompute society reputation when an event's status/rating changes.
  // Simple version per master doc §3.14.3.
  // ============================================================
  async recomputeSocietyReputation(societyId: string): Promise<void> {
    await this.db.$executeRaw(Prisma.sql`
      UPDATE societies SET
        events_count = (SELECT COUNT(*) FROM events WHERE society_id = ${societyId}::uuid),
        reputation_score = COALESCE(LEAST(100,
          35 * (SELECT COALESCE(AVG(bp.avg_rating::float), 4.2) FROM events e
                JOIN business_profiles bp ON bp.id = e.organiser_id
                WHERE e.society_id = ${societyId}::uuid AND e.status = 'live') +
          25 * LEAST(1.0, (SELECT COUNT(*)::float FROM events WHERE society_id = ${societyId}::uuid) / 20.0) +
          20 * (SELECT COALESCE(AVG(CASE WHEN verified THEN 1.0 ELSE 0.0 END), 0)
                FROM business_profiles bp
                JOIN events e ON e.organiser_id = bp.id
                WHERE e.society_id = ${societyId}::uuid)
        ), 0)
      WHERE id = ${societyId}::uuid
    `);
  }

  // ============================================================
  // Discover — geo-radius + composite ranking (Step 4)
  //
  // Pipeline:
  //   1. Raw SQL filters by ST_DWithin on the GIST-indexed `geo` column.
  //   2. The same query computes distance + composite score and orders by score.
  //   3. We then re-fetch full rows via Prisma (cheap; small N).
  //   4. We re-order client-side to match the score order and attach distance.
  //
  // Composite score:
  //   0.4 * distance_freshness  (1 = at your feet, 0 = at the radius)
  //   0.3 * organiser_rating    (avg_rating / 5)
  //   0.3 * date_freshness      (1 = today, 0 = end of window)
  // ============================================================
  async discover(
    input: DiscoverDto,
  ): Promise<{ items: PublicEvent[]; meta: { lat: number; lng: number; radiusM: number } }> {
    // Round lat/lng to 3 decimals (~110m) so nearby users share cache slots.
    const rounded = {
      lat: Math.round(input.lat * 1000) / 1000,
      lng: Math.round(input.lng * 1000) / 1000,
      radiusM: input.radiusM,
      daysAhead: input.daysAhead,
      categories: input.categories,
      limit: input.limit,
    };
    const cacheKey = `events:discover:${this.filterHash(rounded)}`;
    return this.cache.wrap(cacheKey, DISCOVER_CACHE_TTL_S, () => this.discoverFromDb(input));
  }

  private async discoverFromDb(
    input: DiscoverDto,
  ): Promise<{ items: PublicEvent[]; meta: { lat: number; lng: number; radiusM: number } }> {
    const { lat, lng, radiusM, daysAhead, categories, limit } = input;

    type Candidate = { id: string; distance_m: number };

    const categoryFilter = categories && categories.length > 0;

    const candidates = await this.db.$queryRaw<Candidate[]>(Prisma.sql`
      SELECT e.id::text AS id,
             ST_Distance(e.geo, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography)::float AS distance_m
      FROM events e
      JOIN business_profiles bp ON bp.id = e.organiser_id
      WHERE e.status = 'live'
        AND e.starts_at >= NOW()
        AND e.starts_at <= NOW() + (${daysAhead} || ' days')::interval
        AND ST_DWithin(e.geo, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusM})
        ${
          categoryFilter
            ? Prisma.sql`AND EXISTS (
                SELECT 1 FROM stalls s WHERE s.event_id = e.id AND s.category = ANY(${categories}::text[])
              )`
            : Prisma.empty
        }
      ORDER BY (
        0.4 * (1.0 - LEAST(1.0, ST_Distance(e.geo, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography)::float / ${radiusM}::float))
        + 0.3 * COALESCE(bp.avg_rating::float / 5.0, 0)
        + 0.3 * (1.0 - LEAST(1.0, EXTRACT(EPOCH FROM (e.starts_at - NOW())) / (${daysAhead}::float * 86400.0)))
      ) DESC, e.starts_at ASC
      LIMIT ${limit}
    `);

    if (candidates.length === 0) {
      return { items: [], meta: { lat, lng, radiusM } };
    }

    const distanceById = new Map(candidates.map((c) => [c.id, c.distance_m]));
    const ids = candidates.map((c) => c.id);

    const rows = await this.db.event.findMany({
      where: { id: { in: ids } },
      include: {
        organiser: {
          select: { username: true, displayName: true, verified: true, avgRating: true },
        },
        society: {
          select: { slug: true, name: true, city: true, reputationScore: true },
        },
        stalls: {
          select: { available: true, booked: true, pricePaise: true },
        },
      },
    });

    // Restore the score-based order from `candidates`.
    const byId = new Map(rows.map((r) => [r.id, r]));
    const items = ids
      .map((id) => byId.get(id))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .map((r) => {
        const pub = this.toPublic(r);
        pub.distanceM = Math.round(distanceById.get(r.id) ?? 0);
        return pub;
      });

    return { items, meta: { lat, lng, radiusM } };
  }

  // ============================================================
  // ListForOrganiser — public events of a business profile, split by time (Step 7c)
  // ============================================================
  async listForOrganiser(
    organiserId: string,
    when: 'upcoming' | 'past',
  ): Promise<PublicEvent[]> {
    const now = new Date();
    // Upcoming = anything still running (endsAt in the future). Same convention
    // as the main list — using startsAt would silently hide currently-LIVE events.
    const where =
      when === 'upcoming'
        ? { organiserId, status: 'live', endsAt: { gte: now } }
        : {
            organiserId,
            OR: [
              { status: 'live', endsAt: { lt: now } },
              { status: 'cancelled' },
            ],
          };

    const rows = await this.db.event.findMany({
      where,
      orderBy: when === 'upcoming' ? { startsAt: 'asc' } : { startsAt: 'desc' },
      take: 24,
      include: {
        organiser: {
          select: { username: true, displayName: true, verified: true, avgRating: true },
        },
        society: {
          select: { slug: true, name: true, city: true, reputationScore: true },
        },
        stalls: { select: { available: true, booked: true, pricePaise: true } },
      },
    });
    return rows.map((r) => this.toPublic(r));
  }

  // ============================================================
  // Mine — events owned by the signed-in user (Step 5)
  // ============================================================
  async listMine(userId: string): Promise<PublicEvent[]> {
    const rows = await this.db.event.findMany({
      where: { organiser: { userId } },
      orderBy: { createdAt: 'desc' },
      include: {
        organiser: {
          select: { username: true, displayName: true, verified: true, avgRating: true },
        },
        society: {
          select: { slug: true, name: true, city: true, reputationScore: true },
        },
        stalls: {
          select: { available: true, booked: true, pricePaise: true },
        },
      },
    });
    return rows.map((r) => ({ ...this.toPublic(r), status: r.status }));
  }

  // ============================================================
  // Create — by an organiser business profile (Step 5)
  // ============================================================
  async create(userId: string, input: CreateEventDto): Promise<PublicEvent & { status: string }> {
    // Resolve organiser profile: pick the user's first 'organiser' profile.
    const organiser = await this.db.businessProfile.findFirst({
      where: { userId, type: 'organiser' },
    });
    if (!organiser) {
      throw new ForbiddenException({
        code: 'no_organiser_profile',
        message: 'You need an organiser profile before creating an event',
      });
    }

    if (new Date(input.startsAt) >= new Date(input.endsAt)) {
      throw new ForbiddenException({
        code: 'invalid_dates',
        message: 'endsAt must be after startsAt',
      });
    }

    // Resolve society link.
    let societyId: string | undefined;
    if (input.societySlug) {
      const society = await this.db.society.findUnique({ where: { slug: input.societySlug } });
      if (!society) {
        throw new NotFoundException({
          code: 'society_not_found',
          message: `Society ${input.societySlug} not found`,
        });
      }
      societyId = society.id;
    } else {
      // FINAL: auto-resolve nearest society within 3km if none provided.
      const auto = await this.resolveNearestSociety(input.latitude, input.longitude);
      if (auto) societyId = auto;
    }

    // Generate a slug from the title; ensure uniqueness by appending a random suffix on collision.
    let slug = this.slugify(input.title);
    if (await this.db.event.findUnique({ where: { slug } })) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    // Prefer the new multi-image field; fall back to the legacy single field.
    const initialCovers =
      input.coverImageUrls && input.coverImageUrls.length > 0
        ? input.coverImageUrls
        : input.coverImageUrl
          ? [input.coverImageUrl]
          : [];

    const event = await this.db.event.create({
      data: {
        organiserId: organiser.id,
        societyId,
        slug,
        title: input.title,
        description: input.description,
        coverImages: initialCovers,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        latitude: input.latitude,
        longitude: input.longitude,
        addressText: input.addressText,
        capacity: input.capacity,
        status: 'draft',
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        stalls: input.stalls.length
          ? {
              create: input.stalls.map((s) => ({
                category: s.category,
                pricePaise: s.pricePaise,
                available: s.available,
                facilities: (s.facilities ?? {}) as Prisma.InputJsonValue,
              })),
            }
          : undefined,
      },
      include: {
        organiser: { select: { username: true, displayName: true, verified: true, avgRating: true } },
        society: { select: { slug: true, name: true, city: true, reputationScore: true } },
        stalls: { select: { available: true, booked: true, pricePaise: true } },
      },
    });

    // Recompute society reputation (fire-and-forget).
    if (societyId) {
      void this.recomputeSocietyReputation(societyId);
    }

    return { ...this.toPublic(event), status: event.status };
  }

  // ============================================================
  // Update — owner-only (Step 5)
  // ============================================================
  async update(
    userId: string,
    id: string,
    input: UpdateEventDto,
  ): Promise<PublicEvent & { status: string }> {
    await this.assertOwnership(userId, id);

    let societyId: string | undefined;
    if (input.societySlug) {
      const society = await this.db.society.findUnique({ where: { slug: input.societySlug } });
      if (!society) throw new NotFoundException(`Society ${input.societySlug} not found`);
      societyId = society.id;
    }

    const updateData: Prisma.EventUpdateInput = {
      ...(input.title && { title: input.title }),
      ...(input.description && { description: input.description }),
      // New multi-image field takes priority over legacy single-image field.
      ...(input.coverImageUrls !== undefined && {
        coverImages: input.coverImageUrls,
      }),
      ...(input.coverImageUrls === undefined &&
        input.coverImageUrl !== undefined && {
          coverImages: input.coverImageUrl ? [input.coverImageUrl] : [],
        }),
      ...(input.startsAt && { startsAt: new Date(input.startsAt) }),
      ...(input.endsAt && { endsAt: new Date(input.endsAt) }),
      ...(input.latitude !== undefined && { latitude: input.latitude }),
      ...(input.longitude !== undefined && { longitude: input.longitude }),
      ...(input.addressText && { addressText: input.addressText }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.metadata && { metadata: input.metadata as Prisma.InputJsonValue }),
      ...(societyId && { society: { connect: { id: societyId } } }),
    };

    const event = await this.db.event.update({
      where: { id },
      data: updateData,
      include: {
        organiser: { select: { username: true, displayName: true, verified: true, avgRating: true } },
        society: { select: { slug: true, name: true, city: true, reputationScore: true } },
        stalls: { select: { available: true, booked: true, pricePaise: true } },
      },
    });

    // Edits to a published event (title, cover, date, capacity) need to be
    // visible immediately in public listings.
    if (event.status === 'live') {
      await Promise.all([
        this.cache.invalidatePrefix('events:list:'),
        this.cache.invalidatePrefix('events:discover:'),
      ]);
    }

    return { ...this.toPublic(event), status: event.status };
  }

  // ============================================================
  // Submit — moves draft → live
  // In dev we auto-approve. In production this moves to 'pending_verification'
  // and an admin must approve via the (future) admin panel.
  // ============================================================
  async submit(userId: string, id: string): Promise<{ status: string }> {
    await this.assertOwnership(userId, id);
    const nextStatus = process.env.NODE_ENV === 'production' ? 'pending_verification' : 'live';
    const event = await this.db.event.update({
      where: { id },
      data: { status: nextStatus },
    });
    // Drop the public-list and discover caches so the newly-live event is
    // visible immediately rather than after the 30-second TTL.
    if (nextStatus === 'live') {
      await Promise.all([
        this.cache.invalidatePrefix('events:list:'),
        this.cache.invalidatePrefix('events:discover:'),
      ]);
    }
    return { status: event.status };
  }

  // ============================================================
  // Detail
  // ============================================================
  async findBySlug(slug: string): Promise<PublicEvent> {
    const row = await this.db.event.findUnique({
      where: { slug },
      include: {
        organiser: {
          select: { id: true, username: true, displayName: true, verified: true, avgRating: true },
        },
        society: {
          select: { slug: true, name: true, city: true, reputationScore: true },
        },
        stalls: {
          select: {
            id: true,
            category: true,
            pricePaise: true,
            available: true,
            booked: true,
            facilities: true,
          },
          orderBy: [{ category: 'asc' }, { pricePaise: 'asc' }],
        },
      },
    });
    if (!row || row.status !== 'live') {
      throw new NotFoundException(`Event "${slug}" not found`);
    }
    const pub = this.toPublic(row);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pub.stallsList = row.stalls.map((s: any) => ({
      id: s.id,
      category: s.category,
      pricePaise: s.pricePaise,
      available: s.available,
      booked: s.booked,
      slotsLeft: Math.max(0, s.available - s.booked),
      facilities: s.facilities,
    }));
    // Check active featured.
    const active = await this.db.featuredListing.findFirst({
      where: { eventId: row.id, endsAt: { gt: new Date() } },
      select: { id: true },
    });
    if (active) pub.isFeatured = true;
    return pub;
  }

  // ABAC: only the organiser's user can mutate the event.
  private async assertOwnership(userId: string, eventId: string): Promise<void> {
    const event = await this.db.event.findUnique({
      where: { id: eventId },
      select: { organiser: { select: { userId: true } } },
    });
    if (!event) throw new NotFoundException(`Event ${eventId} not found`);
    if (event.organiser.userId !== userId) {
      throw new ForbiddenException({
        code: 'not_owner',
        message: 'You do not own this event',
      });
    }
  }

  private slugify(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80);
  }

  // Maps a Prisma row to the public DTO shape.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toPublic(row: any): PublicEvent {
    const totalAvailable = row.stalls.reduce(
      (sum: number, s: { available: number }) => sum + s.available,
      0,
    );
    const totalBooked = row.stalls.reduce(
      (sum: number, s: { booked: number }) => sum + s.booked,
      0,
    );
    const priceFromPaise = row.stalls.length
      ? Math.min(...row.stalls.map((s: { pricePaise: number }) => s.pricePaise))
      : null;

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      coverImages: row.coverImages,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      addressText: row.addressText,
      capacity: row.capacity,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      metadata: row.metadata,
      organiser: {
        username: row.organiser.username,
        displayName: row.organiser.displayName,
        verified: row.organiser.verified,
        avgRating: Number(row.organiser.avgRating),
      },
      society: row.society
        ? {
            slug: row.society.slug,
            name: row.society.name,
            city: row.society.city,
            reputationScore: Number(row.society.reputationScore),
          }
        : null,
      stalls: {
        available: totalAvailable - totalBooked,
        booked: totalBooked,
        priceFromPaise,
      },
    };
  }
}
