import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().default(4000),
  HOST: z.string().default('0.0.0.0'),
  STORAGE: z.enum(['memory', 'postgres']).default('memory'),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  DEMO_AUTH: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  AI_PROVIDER: z.enum(['mock']).default('mock'),
  LOG_LEVEL: z.string().default('info'),
  // log = correos simulados (GET /v1/dev/emails); smtp = Mailpit en local/Docker (http://localhost:8025)
  EMAIL_PROVIDER: z.enum(['log', 'smtp']).default('log'),
  SMTP_URL: z.string().default('smtp://localhost:1025'),
  EMAIL_FROM: z.string().default('NexoTalent AI <no-reply@nexotalent.example.com>'),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(env: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.parse(env);
  if (parsed.STORAGE === 'postgres' && !parsed.DATABASE_URL) {
    throw new Error('STORAGE=postgres requiere DATABASE_URL');
  }
  return parsed;
}
