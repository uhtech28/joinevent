// Sentry initialisation + Express middleware adapters.
// All functions are NO-OPS if SENTRY_DSN is not set, so dev runs clean.

import type { Request, Response, NextFunction } from 'express';
import type { Env } from '../env';

// We require Sentry lazily so the dep is optional in dev.
type SentryNs = typeof import('@sentry/node');
let Sentry: SentryNs | null = null;
let enabled = false;

export function initSentry(env: Env) {
  if (!env.SENTRY_DSN) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Sentry = require('@sentry/node') as SentryNs;
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
      release: process.env.GIT_COMMIT_SHA,
    });
    enabled = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Sentry init failed (dep missing?). Continuing without it.', (err as Error).message);
  }
}

export function sentryRequestHandler() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (enabled && Sentry) {
      Sentry.withScope((scope) => {
        scope.setTag('request_id', (req as any).requestId);
        next();
      });
      return;
    }
    next();
  };
}

export function sentryErrorHandler() {
  return (err: Error, _req: Request, _res: Response, next: NextFunction) => {
    if (enabled && Sentry) Sentry.captureException(err);
    next(err);
  };
}

export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (!enabled || !Sentry) return;
  Sentry.withScope((scope) => {
    if (context) {
      for (const [k, v] of Object.entries(context)) scope.setExtra(k, v);
    }
    Sentry!.captureException(err);
  });
}
