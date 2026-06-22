import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { loadEnv } from '../env';

/**
 * PrismaService — primary client (read+write).
 *
 * Read replicas are exposed as the `replicaClient` getter, which round-robins
 * between any configured replicas and falls back to the primary when none exist.
 *
 * We deliberately do NOT call this getter `read` — Prisma 5's client proxy
 * intercepts top-level property access and `read` returned undefined, which
 * crashed every consumer with "Cannot read properties of undefined (reading
 * 'findMany')".
 *
 * Use:
 *   db.event.findMany(...)               // primary
 *   db.replicaClient.event.findMany(...) // replica (round-robin) — hot read paths
 *   db.$transaction(...)                 // always primary
 *
 * Mutations and transactions ALWAYS use the primary because replicas are
 * read-only and have replication lag.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(PrismaService.name);
  private replicas: PrismaClient[] = [];
  private readCounter = 0;

  async onModuleInit() {
    await this.$connect();

    const env = loadEnv();
    const replicaUrls = [env.DATABASE_URL_READ_1, env.DATABASE_URL_READ_2].filter(
      (u): u is string => typeof u === 'string' && u.length > 0,
    );
    for (const url of replicaUrls) {
      const c = new PrismaClient({ datasources: { db: { url } } });
      try {
        await c.$connect();
        this.replicas.push(c);
      } catch (err) {
        this.log.warn(`Replica unreachable, skipping: ${(err as Error).message}`);
      }
    }
    this.log.log(
      `Prisma connected — primary + ${this.replicas.length} read replica${this.replicas.length === 1 ? '' : 's'}`,
    );
  }

  async onModuleDestroy() {
    await this.$disconnect();
    for (const c of this.replicas) await c.$disconnect().catch(() => {});
  }

  /**
   * Round-robin read client. Falls back to primary if no replicas configured.
   * Use only for read paths that tolerate < 100ms replication lag (event list,
   * discover, org profile, society reputation). NEVER for read-your-own-write
   * paths (e.g. the response to a booking — must read its own wallet update).
   *
   * NOTE: Named `replicaClient`, not `read`, because Prisma 5's client proxy
   * shadows the `read` property and returns undefined, breaking every consumer.
   */
  get replicaClient(): PrismaClient {
    if (this.replicas.length === 0) return this;
    this.readCounter = (this.readCounter + 1) % this.replicas.length;
    return this.replicas[this.readCounter];
  }
}
