import type { Config } from 'jest';

// Integration tests for Join Events API.
// They hit a REAL Postgres + Redis — point DATABASE_URL_TEST at a throwaway DB.
// Run with: pnpm --filter @joinevents/api test

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/test', '<rootDir>/src'],
  testMatch: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
  testTimeout: 30_000,
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  collectCoverageFrom: [
    'src/wallet/**/*.ts',
    'src/bookings/**/*.ts',
    'src/auth/**/*.ts',
    '!**/*.module.ts',
    '!**/*.dto.ts',
  ],
  coverageThreshold: {
    global: {
      lines: 60,
      branches: 50,
      functions: 60,
      statements: 60,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  // Force serial run — tests share the test DB.
  maxWorkers: 1,
};

export default config;
