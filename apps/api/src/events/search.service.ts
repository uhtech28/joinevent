import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MeiliSearch, type Index } from 'meilisearch';
import { PrismaService } from '../prisma/prisma.service';
import { loadEnv } from '../env';

/**
 * SearchService — Meilisearch facade.
 *
 * Behaviour:
 *  - If MEILI_HOST is set, on boot we sync all live events to a Meili index
 *    and provide a fast typo-tolerant `search()`.
 *  - If MEILI_HOST is blank, `search()` returns null and EventsService falls
 *    back to Postgres FTS automatically.
 */
@Injectable()
export class SearchService implements OnModuleInit {
  private readonly log = new Logger(SearchService.name);
  private client: MeiliSearch | null = null;
  private index: Index | null = null;

  constructor(private readonly db: PrismaService) {}

  async onModuleInit() {
    const env = loadEnv();
    if (!env.MEILI_HOST) {
      this.log.log('MEILI_HOST not set — search falls back to Postgres FTS');
      return;
    }
    try {
      this.client = new MeiliSearch({
        host: env.MEILI_HOST,
        apiKey: env.MEILI_MASTER_KEY,
      });
      this.index = this.client.index('events');
      // Configure once
      await this.index.updateSearchableAttributes(['title', 'description', 'addressText', 'societyName']);
      await this.index.updateFilterableAttributes(['city', 'category', 'verified']);
      // Initial backfill
      await this.fullResync();
      this.log.log('Meilisearch ready — events indexed');
    } catch (err) {
      this.log.warn(`Meilisearch init failed; falling back: ${(err as Error).message}`);
      this.client = null;
      this.index = null;
    }
  }

  isAvailable(): boolean {
    return !!this.index;
  }

  async fullResync(): Promise<void> {
    if (!this.index) return;
    const events = await this.db.event.findMany({
      where: { status: 'live' },
      include: {
        organiser: { select: { verified: true } },
        society: { select: { name: true, city: true } },
        stalls: { select: { category: true } },
      },
      take: 5000,
    });
    const docs = events.map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      description: e.description,
      addressText: e.addressText,
      societyName: e.society?.name ?? null,
      city: e.society?.city ?? null,
      category: [...new Set(e.stalls.map((s) => s.category))],
      verified: e.organiser.verified,
      startsAt: new Date(e.startsAt).getTime(),
    }));
    if (docs.length > 0) {
      await this.index.addDocuments(docs);
    }
  }

  async search(q: string, filters?: { city?: string; category?: string; verified?: boolean }): Promise<string[] | null> {
    if (!this.index) return null;
    const filterParts: string[] = [];
    if (filters?.city) filterParts.push(`city = "${filters.city.replace(/"/g, '\\"')}"`);
    if (filters?.category) filterParts.push(`category = "${filters.category.replace(/"/g, '\\"')}"`);
    if (filters?.verified) filterParts.push('verified = true');
    const res = await this.index.search(q, {
      limit: 30,
      ...(filterParts.length > 0 ? { filter: filterParts.join(' AND ') } : {}),
      attributesToRetrieve: ['id'],
    });
    return (res.hits as Array<{ id: string }>).map((h) => h.id);
  }
}
