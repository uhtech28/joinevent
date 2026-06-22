// Prometheus /metrics endpoint.
// Scraped by Prometheus (or any compatible — Grafana Cloud, VictoriaMetrics).
// Default Node + process metrics + custom counters for the money paths.
//
// IMPORTANT: this endpoint must be reachable ONLY from your monitoring network
// in production. Put it behind a path that's not in the public router, or
// network-restrict via Caddy/nginx.

import { Controller, Get, Header } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { MetricsService } from './metrics.service';

@Controller('metrics')
@SkipThrottle()
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async scrape(): Promise<string> {
    return this.metrics.registry.metrics();
  }
}
