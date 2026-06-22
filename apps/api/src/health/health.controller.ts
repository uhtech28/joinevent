// Two probes:
//   GET /health/live  — process up. Cheap. K8s liveness probe target.
//   GET /health/ready — DB + Redis reachable. K8s readiness probe target.
//   GET /health       — back-compat alias of /live.
// All endpoints skip the global throttler so monitoring doesn't get rate-limited.

import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly db: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  liveBackCompat() {
    return this.live();
  }

  @Get('live')
  live() {
    return {
      status: 'ok',
      service: 'joinevents-api',
      version: '0.2.0',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.round(process.uptime()),
    };
  }

  /**
   * Readiness probe.
   * Returns 503 if any required dependency is unhealthy so the orchestrator
   * stops routing traffic to this instance. Each check times out fast (≤500ms).
   */
  @Get('ready')
  async ready() {
    const checks: Record<string, { ok: boolean; latencyMs: number; error?: string }> = {};

    // Postgres
    {
      const start = Date.now();
      try {
        await withTimeout(this.db.$queryRaw`SELECT 1`, 500);
        checks.postgres = { ok: true, latencyMs: Date.now() - start };
      } catch (err) {
        checks.postgres = {
          ok: false,
          latencyMs: Date.now() - start,
          error: (err as Error).message,
        };
      }
    }

    // Redis (best-effort — Redis is degradable, not strictly required)
    {
      const start = Date.now();
      try {
        await withTimeout(this.redis.get('__health__'), 500);
        checks.redis = { ok: true, latencyMs: Date.now() - start };
      } catch (err) {
        checks.redis = {
          ok: false,
          latencyMs: Date.now() - start,
          error: (err as Error).message,
        };
      }
    }

    const allOk = Object.values(checks).every((c) => c.ok);
    const body = {
      status: allOk ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    };
    if (!allOk) {
      throw new ServiceUnavailableException(body);
    }
    return body;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms),
    ),
  ]);
}
