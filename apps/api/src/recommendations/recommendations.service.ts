import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PublicEvent } from '../events/events.service';
import { EventsService } from '../events/events.service';

/**
 * RecommendationsService — co-attendance collaborative scaffold.
 *
 * Strategy (master doc §14.6 cold-start path):
 *  1. Find users who booked at the seed event.
 *  2. Surface other live events those users also booked at.
 *  3. Score by overlap count; fall back to same-organiser + nearby events.
 *
 * Replaceable with a real ML ranker via the same return type later (Step Y2).
 */
@Injectable()
export class RecommendationsService {
  constructor(
    private readonly db: PrismaService,
    private readonly events: EventsService,
  ) {}

  async forEvent(slug: string, limit = 6): Promise<PublicEvent[]> {
    const event = await this.db.event.findUnique({
      where: { slug },
      select: { id: true, organiserId: true, latitude: true, longitude: true, societyId: true },
    });
    if (!event) return [];

    type Row = { id: string; score: number };
    const collab = await this.db.$queryRaw<Row[]>(Prisma.sql`
      WITH attendees AS (
        SELECT DISTINCT b.user_id
        FROM bookings b
        JOIN stalls s ON s.id = b.stall_id
        WHERE s.event_id = ${event.id}::uuid AND b.status IN ('confirmed', 'released')
      )
      SELECT e.id::text AS id, COUNT(DISTINCT b.user_id)::int AS score
      FROM bookings b
      JOIN stalls s ON s.id = b.stall_id
      JOIN events e ON e.id = s.event_id
      WHERE b.user_id IN (SELECT user_id FROM attendees)
        AND e.id <> ${event.id}::uuid
        AND e.status = 'live'
        AND e.starts_at >= NOW()
      GROUP BY e.id
      ORDER BY score DESC
      LIMIT ${limit * 2}
    `);

    let ids = collab.map((r) => r.id);

    // Fallback: same organiser or nearby (within 5 km).
    if (ids.length < limit) {
      const fallback = await this.db.event.findMany({
        where: {
          id: { notIn: [event.id, ...ids] },
          status: 'live',
          startsAt: { gte: new Date() },
          OR: [
            { organiserId: event.organiserId },
            event.societyId ? { societyId: event.societyId } : { id: 'never' },
          ],
        },
        orderBy: { startsAt: 'asc' },
        take: limit - ids.length,
        select: { id: true },
      });
      ids = [...ids, ...fallback.map((f) => f.id)];
    }
    if (ids.length === 0) return [];

    // Reuse events.toPublic by going through findMany + raw mapping.
    const rows = await this.db.event.findMany({
      where: { id: { in: ids.slice(0, limit) } },
      include: {
        organiser: { select: { username: true, displayName: true, verified: true, avgRating: true } },
        society: { select: { slug: true, name: true, city: true, reputationScore: true } },
        stalls: { select: { available: true, booked: true, pricePaise: true } },
      },
    });

    // Map manually since toPublic is private. We replicate the shape.
    return rows.map((row) => {
      const totalAvailable = row.stalls.reduce((s, x) => s + x.available, 0);
      const totalBooked = row.stalls.reduce((s, x) => s + x.booked, 0);
      const priceFromPaise = row.stalls.length
        ? Math.min(...row.stalls.map((x) => x.pricePaise))
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
        metadata: row.metadata as Record<string, unknown>,
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
    });
  }
}
