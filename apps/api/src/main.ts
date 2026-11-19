import { loadEnv } from './config.js';
import { createPostgresDeps } from './infra/db/postgres-adapters.js';
import { createLogEmailSender, createSmtpEmailSender } from './infra/email/email-senders.js';
import { buildApp } from './infra/http/app.js';
import { createMemoryDeps } from './infra/memory/memory-adapters.js';
import { buildSeed } from './seed/seed-data.js';
import { systemClock } from './shared/clock.js';

const env = loadEnv();
const logSender = createLogEmailSender((m) => console.log(m));
const email = env.EMAIL_PROVIDER === 'smtp' ? createSmtpEmailSender(env.SMTP_URL, env.EMAIL_FROM) : logSender;
const { deps, close } =
  env.STORAGE === 'postgres'
    ? createPostgresDeps(env.DATABASE_URL!, systemClock, email)
    : { deps: createMemoryDeps(buildSeed(systemClock.now()), systemClock, email), close: async () => {} };

const app = await buildApp(deps, {
  jwtSecret: env.JWT_SECRET,
  demoAuth: env.DEMO_AUTH,
  corsOrigins: env.CORS_ORIGINS.split(',').map((s) => s.trim()),
  logger: true,
  outbox: env.EMAIL_PROVIDER === 'log' ? logSender.outbox : undefined,
});

const shutdown = async () => {
  await app.close();
  await close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

await app.listen({ port: env.PORT, host: env.HOST });
app.log.info(`NexoTalent API (${env.STORAGE}) escuchando en :${env.PORT}`);
