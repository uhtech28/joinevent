// Prometheus metrics — counters for the money paths + default Node metrics.
// Lazy-loads prom-client so the dep is optional.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

type CounterLike = { inc: (labels?: Record<string, string>, value?: number) => void };
type HistogramLike = {
  observe: (labels: Record<string, string>, value: number) => void;
};

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly log = new Logger(MetricsService.name);

  // Stubs that no-op when prom-client isn't installed (dev) — code can call
  // them anywhere without guarding.
  registry: { metrics: () => Promise<string> } = {
    metrics: async () => '# prom-client not installed\n',
  };
  bookingsCreated: CounterLike = { inc: () => {} };
  bookingsCancelled: CounterLike = { inc: () => {} };
  paymentsCredited: CounterLike = { inc: () => {} };
  paymentsFailed: CounterLike = { inc: () => {} };
  walletTransfers: CounterLike = { inc: () => {} };
  httpDuration: HistogramLike = { observe: () => {} };

  async onModuleInit() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const prom = require('prom-client');
      const registry = new prom.Registry();
      prom.collectDefaultMetrics({ register: registry, prefix: 'joinevents_' });

      this.bookingsCreated = new prom.Counter({
        name: 'joinevents_bookings_created_total',
        help: 'Stall bookings created',
        labelNames: ['category'],
        registers: [registry],
      });
      this.bookingsCancelled = new prom.Counter({
        name: 'joinevents_bookings_cancelled_total',
        help: 'Stall bookings cancelled (refunded)',
        registers: [registry],
      });
      this.paymentsCredited = new prom.Counter({
        name: 'joinevents_payments_credited_total',
        help: 'Wallet top-ups credited',
        labelNames: ['source'],
        registers: [registry],
      });
      this.paymentsFailed = new prom.Counter({
        name: 'joinevents_payments_failed_total',
        help: 'Payment events that resolved to failed',
        registers: [registry],
      });
      this.walletTransfers = new prom.Counter({
        name: 'joinevents_wallet_transfers_total',
        help: 'Wallet ledger transfers committed',
        labelNames: ['reason'],
        registers: [registry],
      });
      this.httpDuration = new prom.Histogram({
        name: 'joinevents_http_request_duration_seconds',
        help: 'HTTP request duration',
        labelNames: ['method', 'route', 'status'],
        buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
        registers: [registry],
      });

      this.registry = registry;
      this.log.log('Prometheus metrics ready at /api/v1/metrics');
    } catch (err) {
      this.log.warn(
        `prom-client unavailable; metrics endpoint will be empty: ${(err as Error).message}`,
      );
    }
  }
}
