import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().optional().default('mongodb://127.0.0.1:27017/teamflow'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  ENABLE_DEADLINE_JOB: z.string().transform(v => v === 'true').default('true'),
  DEADLINE_JOB_INTERVAL_MS: z.coerce.number().default(60000),

  // Controlled KaizenTrace scenario fault injection flags
  TEST_FAIL_DEADLINE_JOB: z.string().transform(v => v === 'true').default('false'),
  TEST_FAIL_TASK_UPDATE: z.string().transform(v => v === 'true').default('false'),
  TEST_DISABLE_PERMISSIONS: z.string().transform(v => v === 'true').default('false'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
