import 'dotenv/config';
import { z } from 'zod';

/**
 * Validate environment variables once at startup.
 * If anything is missing or malformed, the app fails fast with a clear error
 * instead of crashing later at an unpredictable point.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Single HR user (see docs/Requirements.md). Generate the hash with: npm run hash-password -w apps/api -- "<password>"
  ADMIN_EMAIL: z.email().transform((v) => v.toLowerCase()),
  ADMIN_PASSWORD_HASH: z.string().startsWith('$2', 'ADMIN_PASSWORD_HASH must be a bcrypt hash'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(8),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);
