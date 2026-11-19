/**
 * Integración con PostgreSQL 16 + pgvector real.
 * Requiere TEST_DATABASE_URL (p. ej. `docker compose up -d postgres`). Se omite si no existe.
 * ¡Destructivo! Usa una base de datos dedicada a pruebas.
 */
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { changeApplicationStatus, applyToJob } from '../../src/modules/applications/application/applications.js';
import { confirmSkills } from '../../src/modules/candidates/application/resume.js';
import { getJobMatch } from '../../src/modules/matching/application/get-job-match.js';
import { createPostgresDeps } from '../../src/infra/db/postgres-adapters.js';
import { migrate } from '../../src/infra/db/migrate.js';
import { seedDatabase } from '../../src/infra/db/seed.js';
import { buildSeed } from '../../src/seed/seed-data.js';
import { fixedClock } from '../../src/shared/clock.js';
import { PreconditionFailedError } from '../../src/shared/errors.js';

const url = process.env.TEST_DATABASE_URL;
const NOW = '2026-11-17T12:00:00.000Z';

describe.skipIf(!url)('adaptadores PostgreSQL + pgvector', () => {
  const clock = fixedClock(NOW);
  let pg: ReturnType<typeof createPostgresDeps>;

  beforeAll(async () => {
    const admin = postgres(url!, { max: 1, onnotice: () => {} });
    await admin.unsafe('DROP SCHEMA IF EXISTS identity, jobs, candidates, applications, matching, notifications CASCADE; DROP TABLE IF EXISTS public.schema_migrations;');
    await admin.end();
    await migrate(url!, fileURLToPath(new URL('../../migrations', import.meta.url)), () => {});
    await seedDatabase(url!, buildSeed(clock.now()));
    pg = createPostgresDeps(url!, clock);
  });
  afterAll(() => pg?.close());

  it('las migraciones son idempotentes', async () => {
    expect(await migrate(url!, fileURLToPath(new URL('../../migrations', import.meta.url)), () => {})).toEqual([]);
  });

  it('calcula el match con embeddings de pgvector y lo cachea en match_score', async () => {
    const first = await getJobMatch(pg.deps, 'usr_ana', 'job_backend_node');
    expect(first.cached).toBe(false);
    expect(first.result.factors.semanticSimilarity).toBeGreaterThan(0);
    const second = await getJobMatch(pg.deps, 'usr_ana', 'job_backend_node');
    expect(second.cached).toBe(true);
    expect(second.etag).toBe(first.etag);
  });

  it('confirmar skills persiste el perfil e invalida la caché', async () => {
    await confirmSkills(pg.deps, 'usr_ana', [{ skillId: 'sk_typescript', level: 5 }, { skillId: 'sk_node_js', level: 5 }]);
    const c = await pg.deps.candidates.getByUserId('usr_ana');
    expect(c!.skills.map((s) => s.skillId).sort()).toEqual(['sk_node_js', 'sk_typescript']);
    expect(c!.embedding).toHaveLength(1024);
    expect((await getJobMatch(pg.deps, 'usr_ana', 'job_backend_node')).cached).toBe(false);
  });

  it('postular respeta UNIQUE(job, candidate) y guarda historial', async () => {
    const app = await applyToJob(pg.deps, 'usr_ana', 'job_backend_node');
    await expect(applyToJob(pg.deps, 'usr_ana', 'job_backend_node')).rejects.toThrow('Ya te postulaste');
    const stored = await pg.deps.applications.get(app.id);
    expect(stored!.history).toHaveLength(1);
    expect((await pg.deps.jobs.get('job_backend_node'))!.applicantsCount).toBe(1);
  });

  it('concurrencia optimista: dos cambios con la misma versión → el segundo falla', async () => {
    const recruiter = (await pg.deps.users.getById('usr_rec'))!;
    await changeApplicationStatus(pg.deps, recruiter, { applicationId: 'app_ana_frontend', to: 'interview_scheduled', expectedVersion: 3 });
    const stale = { ...(await pg.deps.applications.get('app_ana_frontend'))!, version: 5 };
    await expect(pg.deps.applications.update(stale, 3)).rejects.toBeInstanceOf(PreconditionFailedError);
    const app = await pg.deps.applications.get('app_ana_frontend');
    expect(app!.history.map((h) => h.to)).toEqual(['submitted', 'in_review', 'shortlisted', 'interview_scheduled']);
  });

  it('la consulta ANN usa el índice HNSW sobre vacantes publicadas', async () => {
    const vec = (await pg.deps.jobs.get('job_backend_node'))!.embedding!;
    // Con pocas filas el planner prefiere Bitmap Scan (job_prefilter_idx) + Sort sobre HNSW. Se desactivan esas
    // alternativas con SET LOCAL dentro de una transacción para que apliquen a la MISMA conexión del EXPLAIN
    // (un SET suelto puede caer en otra conexión del pool) y no contaminen las demás pruebas.
    const plan = await pg.sql.begin(async (tx) => {
      await tx`SET LOCAL enable_seqscan = off`;
      await tx`SET LOCAL enable_bitmapscan = off`;
      await tx`SET LOCAL enable_sort = off`;
      return tx`EXPLAIN SELECT id FROM jobs.job WHERE status = 'published'
        ORDER BY embedding <=> ${`[${vec.join(',')}]`}::vector LIMIT 5`;
    });
    expect(plan.map((r) => Object.values(r)[0]).join('\n')).toContain('job_embedding_hnsw');
  });
});
