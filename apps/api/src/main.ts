import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { loadEnv } from './env';
import { initSentry, sentryRequestHandler, sentryErrorHandler } from './observability/sentry';

async function bootstrap() {
  const env = loadEnv();
  initSentry(env);

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
    bodyParser: true,
  });

  // ----- Request correlation -----
  // Every request gets an x-request-id (echoed back). Logs + Sentry use it.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const id = (req.headers['x-request-id'] as string) || randomUUID();
    res.setHeader('x-request-id', id);
    (req as any).requestId = id;
    next();
  });

  // ----- Sentry request hook (no-op if SENTRY_DSN absent) -----
  app.use(sentryRequestHandler());

  // ----- Security headers -----
  app.use(
    helmet({
      contentSecurityPolicy: false, // CSP is set on the Next side
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: env.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    exposedHeaders: ['x-request-id'],
  });

  // ----- Sentry error hook (must be LAST, before app.listen) -----
  app.use(sentryErrorHandler());

  // ----- Graceful shutdown for queue drain / Prisma disconnect -----
  app.enableShutdownHooks();

  await app.listen(env.PORT, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Join Events API listening on http://localhost:${env.PORT}/api/v1`);
  logger.log(`   Health: http://localhost:${env.PORT}/api/v1/health`);
  logger.log(`   Env: ${env.NODE_ENV} | Sentry: ${env.SENTRY_DSN ? 'on' : 'off'}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
