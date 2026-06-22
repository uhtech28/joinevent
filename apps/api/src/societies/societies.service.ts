import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

export type PublicSociety = {
  id: string;
  slug: string;
  name: string;
  city: string;
  type: 'gated' | 'sector' | 'locality';
  centroidLat: number;
  centroidLng: number;
  reputationScore: number;
  eventsCount: number;
};

// Societies change rarely — 5-min cache is safe and slashes DB load.
const SOCIETIES_CACHE_TTL_S = 300;

@Injectable()
export class SocietiesService {
  constructor(
    private readonly db: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async list(city?: string): Promise<PublicSociety[]> {
    const key = `societies:list:${city ?? 'all'}`;
    return this.cache.wrap(key, SOCIETIES_CACHE_TTL_S, () => this.queryFromDb(city));
  }

  /** Called by admin/society routes that mutate societies — drop the cache. */
  async invalidate(city?: string): Promise<void> {
    await this.cache.del(`societies:list:${city ?? 'all'}`);
    await this.cache.del('societies:list:all');
  }

  private async queryFromDb(city?: string): Promise<PublicSociety[]> {
    const rows = await this.db.society.findMany({
      where: city ? { city: { equals: city, mode: 'insensitive' } } : undefined,
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      city: r.city,
      type: r.type as PublicSociety['type'],
      centroidLat: Number(r.centroidLat),
      centroidLng: Number(r.centroidLng),
      reputationScore: Number(r.reputationScore),
      eventsCount: r.eventsCount,
    }));
  }
}
