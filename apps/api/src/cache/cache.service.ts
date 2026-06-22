// Tiny Redis-backed cache with JSON encode/decode + stampede protection.
// Use for hot read paths (events list, discover, featured tiers).
//
// Pattern:
//   const events = await cache.wrap(`events:list:${hash(filters)}`, 60, () =>
//     this.events.list(filters),
//   );

import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CacheService {
  private readonly log = new Logger(CacheService.name);
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), ttlSeconds);
    } catch (err) {
      this.log.warn(`cache.set ${key} failed: ${(err as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch {
      /* ignore */
    }
  }

  /**
   * Read-through cache with single-flight de-duplication so a thundering herd
   * of N requests on a cold key only triggers ONE upstream load.
   */
  async wrap<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const hit = await this.get<T>(key);
    if (hit !== null) return hit;

    if (this.inflight.has(key)) {
      return this.inflight.get(key) as Promise<T>;
    }

    const p = loader()
      .then(async (v) => {
        await this.set(key, v, ttlSeconds);
        return v;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }

  /** Invalidate by pattern using SCAN+UNLINK (safe — never blocks the server). */
  async invalidatePrefix(prefix: string): Promise<number> {
    try {
      const removed = await this.redis.scanAndDelete(`${prefix}*`);
      if (removed > 0) {
        this.log.debug(`invalidatePrefix(${prefix}) removed ${removed} keys`);
      }
      return removed;
    } catch (err) {
      this.log.warn(
        `invalidatePrefix(${prefix}) failed: ${(err as Error).message}`,
      );
      return 0;
    }
  }
}
