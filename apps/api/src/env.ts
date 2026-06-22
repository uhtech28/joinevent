// Strict environment validation with Zod.
// The API refuses to boot if a required variable is missing or malformed.
// In production we ALSO refuse defaults on safety-critical secrets.

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean)),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_URL_READ_1: z.string().url().optional(),
  DATABASE_URL_READ_2: z.string().url().optional(),
  PRISMA_CONNECTION_LIMIT: z.coerce.number().int().positive().default(20),
  REDIS_URL: z.string().url(),

  // Meilisearch
  MEILI_HOST: z.string().url().optional(),
  MEILI_MASTER_KEY: z.string().optional(),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),

  // OTP
  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_REQUEST_LIMIT: z.coerce.number().int().positive().default(3),
  OTP_REQUEST_WINDOW_SECONDS: z.coerce.number().int().positive().default(900),
  OTP_RETURN_IN_RESPONSE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((s) => s === 'true'),

  // SMS
  SMS_PROVIDER: z.enum(['stub', 'msg91']).default('stub'),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_SENDER_ID: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),

  // Email auth + verification
  PASSWORD_MIN_LENGTH: z.coerce.number().int().min(8).default(8),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(10),

  // Email provider (verification emails, password reset). Stub logs to console.
  EMAIL_PROVIDER: z.enum(['stub', 'postmark', 'sendgrid']).default('stub'),
  EMAIL_FROM: z.string().email().default('no-reply@joinevents.in'),
  POSTMARK_TOKEN: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),

  // Google OAuth — when client id is absent, the /auth/google routes return 503.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z
    .string()
    .url()
    .default('http://localhost:4000/api/v1/auth/google/callback'),
  // Where to redirect after OAuth success — frontend page that reads the token.
  GOOGLE_FRONTEND_SUCCESS_URL: z.string().url().default('http://localhost:3000/login/oauth/success'),
  GOOGLE_FRONTEND_FAILURE_URL: z.string().url().default('http://localhost:3000/login?error=google'),

  // Payments
  PAYU_PROVIDER: z.enum(['stub', 'live']).default('stub'),
  PAYU_MERCHANT_KEY: z.string().optional(),
  PAYU_MERCHANT_SALT: z.string().optional(),
  PAYU_WEBHOOK_SECRET: z.string().optional(),

  // Storage (file uploads — KYC, cover images)
  STORAGE_DRIVER: z.enum(['local', 'r2', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./uploads'),
  STORAGE_R2_ACCOUNT_ID: z.string().optional(),
  STORAGE_R2_BUCKET: z.string().optional(),
  STORAGE_R2_ACCESS_KEY: z.string().optional(),
  STORAGE_R2_SECRET_KEY: z.string().optional(),
  STORAGE_R2_PUBLIC_URL: z.string().url().optional(),

  // Observability
  SENTRY_DSN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Rate limiting (global)
  THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),

  // Queue
  QUEUE_DISABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((s) => s === 'true'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

// Production guard list — these MUST be set explicitly in production,
// not left at their development defaults.
const PROD_REQUIRED_NON_DEFAULT: Array<{ key: keyof Env; bannedValues: string[] }> = [
  { key: 'JWT_SECRET', bannedValues: ['dev-only-change-me-please-32-chars-min-secret-string'] },
];

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid environment variables:\n', parsed.error.format());
    process.exit(1);
  }
  const env = parsed.data;

  // Production safety checks — fail loudly, not silently.
  if (env.NODE_ENV === 'production') {
    const errors: string[] = [];
    if (env.OTP_RETURN_IN_RESPONSE) errors.push('OTP_RETURN_IN_RESPONSE must be false in production');
    if (env.SMS_PROVIDER === 'stub') errors.push('SMS_PROVIDER must be a real provider in production');
    if (env.PAYU_PROVIDER === 'stub') errors.push('PAYU_PROVIDER must be live in production');
    if (env.STORAGE_DRIVER === 'local') {
      errors.push(
        'STORAGE_DRIVER=local is unsafe in production (lost on container restart); use r2 or s3',
      );
    }
    if (!env.SENTRY_DSN) errors.push('SENTRY_DSN must be set in production');
    if (env.CORS_ORIGINS.includes('http://localhost:3000')) {
      errors.push('CORS_ORIGINS still contains localhost:3000 in production');
    }
    for (const rule of PROD_REQUIRED_NON_DEFAULT) {
      const v = env[rule.key];
      if (typeof v === 'string' && rule.bannedValues.includes(v)) {
        errors.push(`${rule.key} is still set to its dev default — rotate it before production`);
      }
    }
    if (errors.length > 0) {
      // eslint-disable-next-line no-console
      console.error('❌ Refusing to boot in production:\n  - ' + errors.join('\n  - '));
      process.exit(1);
    }
  }

  cached = env;
  return cached;
}
