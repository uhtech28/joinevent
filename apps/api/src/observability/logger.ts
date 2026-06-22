// Pino-based structured JSON logger.
// In dev: pretty-printed via pino-pretty.
// In production: line-delimited JSON for Loki / Datadog ingestion.
//
// Use NestJS Logger as before — we install pino as the underlying transport
// in main.ts via nestjs-pino's LoggerModule.

import type { Params } from 'nestjs-pino';
import type { Env } from '../env';

export function buildPinoConfig(env: Env): Params {
  return {
    pinoHttp: {
      level: env.LOG_LEVEL,
      // Redact secrets — defense in depth in case someone logs a request body
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.otp',
          'req.body.password',
          'req.body.refreshToken',
          'req.body.accessToken',
          '*.jwt',
          '*.refreshToken',
        ],
        censor: '[REDACTED]',
      },
      // Each log line gets the request id for cross-service correlation.
      customProps: (req) => ({
        requestId: (req as { requestId?: string }).requestId,
        env: env.NODE_ENV,
      }),
      // Don't log noisy success access logs at info; we get them via Caddy.
      serializers: {
        req: (req: { method: string; url: string; id?: string }) => ({
          method: req.method,
          url: req.url,
          id: req.id,
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      // Pretty-print in dev only.
      transport:
        env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                singleLine: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname,env',
              },
            }
          : undefined,
    },
  };
}
