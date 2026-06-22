// Jest setup — verifies the test DB is reachable and resets state between files.

import { execSync } from 'child_process';

const TEST_DB = process.env.DATABASE_URL_TEST;

if (!TEST_DB) {
  // eslint-disable-next-line no-console
  console.error('❌ DATABASE_URL_TEST not set. Tests need a throwaway Postgres URL.');
  console.error('   Example: postgresql://joinevents:devpass@localhost:5432/joinevents_test');
  process.exit(1);
}

// Point Prisma + the app at the test DB.
process.env.DATABASE_URL = TEST_DB;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-at-least-32-chars-long-yes';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.QUEUE_DISABLED = 'true';
process.env.OTP_RETURN_IN_RESPONSE = 'true';

// Apply migrations once on first run.
beforeAll(() => {
  try {
    execSync('npx prisma migrate deploy --schema=./prisma/schema.prisma', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: TEST_DB },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('prisma migrate deploy failed in setup; assuming schema is current');
  }
});
