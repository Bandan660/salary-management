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
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);
