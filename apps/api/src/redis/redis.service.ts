import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { loadEnv } from '../env';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(RedisService.name);
  private client: Redis | null = null;
  private healthy = false;

  async onModuleInit() {
    const env = loadEnv();
    this.client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 200, 2000),
      reconnectOnError: () => true,
    });

    // Listen but DON'T crash the app on Redis-level errors. App boots
    // even if Redis is unreachable; rate-limited features will throw on use.
    this.client.on('error', (err) => {
      this.healthy = false;
      this.log.warn(`Redis error: ${err.message || '(no message)'}`);
    });
    this.client.on('ready', () => {
      this.healthy = true;
      this.log.log('Redis connected');
    });

    try {
      await this.client.connect();
    } catch (err) {
      this.log.warn(
        `Redis initial connect failed: ${(err as Error).message}. App will boot anyway; Redis-backed features will retry.`,
      );
    }
  }

  async onModuleDestroy() {
    try {
      await this.client?.quit();
    } catch {
      /* ignore */
    }
  }

  private ensureClient(): Redis {
    if (!this.client) throw new Error('Redis client not initialised');
    return this.client;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const c = this.ensureClient();
    if (ttlSeconds) {
      await c.set(key, value, 'EX', ttlSeconds);
    } else {
      await c.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.ensureClient().get(key);
  }

  /**
   * Delete every key matching `pattern` using SCAN + DEL in batches.
   * Safe for production (no `KEYS *` blocking call). Returns the count
   * of keys removed. Glob-style pattern, e.g. `events:list:*`.
   */
  async scanAndDelete(pattern: string): Promise<number> {
    if (!this.client) return 0;
    const c = this.client;
    let removed = 0;
    return new Promise<number>((resolve, reject) => {
      const stream = c.scanStream({ match: pattern, count: 200 });
      stream.on('data', (keys: string[]) => {
        if (!keys.length) return;
        stream.pause();
        c.unlink(...keys)
          .then((n) => {
            removed += n;
            stream.resume();
          })
          .catch((err) => {
            stream.destroy();
            reject(err);
          });
      });
      stream.on('end', () => resolve(removed));
      stream.on('error', (err) => reject(err));
    });
  }

  async del(key: string): Promise<void> {
    await this.ensureClient().del(key);
  }

  async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const multi = this.ensureClient().multi();
    multi.incr(key);
    multi.expire(key, ttlSeconds, 'NX');
    const result = await multi.exec();
    if (!result) throw new Error('Redis multi returned null');
    return result[0]![1] as number;
  }
}
