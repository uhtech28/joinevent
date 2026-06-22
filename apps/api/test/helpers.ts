// Test helpers — bring up a Nest app + clean DB + seed minimal fixtures.

import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

export interface TestCtx {
  app: INestApplication;
  prisma: PrismaService;
}

export async function bootTestApp(): Promise<TestCtx> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  const prisma = app.get(PrismaService);
  return { app, prisma };
}

export async function truncateAll(prisma: PrismaService): Promise<void> {
  // Truncate every table except prisma migrations. Order doesn't matter with CASCADE.
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
      LOOP
        EXECUTE 'TRUNCATE TABLE "' || r.tablename || '" RESTART IDENTITY CASCADE';
      END LOOP;
    END $$;
  `);
}

export interface SeededUser {
  id: string;
  phone: string;
  walletId: string;
}

export async function createUser(
  prisma: PrismaService,
  phone: string,
  balancePaise = 0,
): Promise<SeededUser> {
  const user = await prisma.user.create({
    data: { phone, role: 'user' },
  });
  const wallet = await prisma.wallet.create({
    data: {
      ownerType: 'user',
      ownerId: user.id,
      balancePaise: 0,
      pendingPaise: 0,
    },
  });
  if (balancePaise > 0) {
    // Credit via raw insert + balance update (bypass full transfer for fixture speed).
    await prisma.$transaction(async (tx) => {
      await tx.walletEntry.create({
        data: {
          walletId: wallet.id,
          direction: 'C',
          amountPaise: balancePaise,
          txnId: 'seed-' + Math.random().toString(36).slice(2),
          reason: 'top_up',
        },
      });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balancePaise: { increment: balancePaise } },
      });
    });
  }
  return { id: user.id, phone, walletId: wallet.id };
}
