import postgres from 'postgres';
import type { Application } from '../../modules/applications/domain/application.js';
import type { ApplicationStatus } from '../../modules/applications/domain/status.js';
import type { Candidate } from '../../modules/candidates/domain/candidate.js';
import type { User } from '../../modules/identity/domain/user.js';
import type { Job } from '../../modules/jobs/domain/job.js';
import type { MatchResult } from '../../modules/matching/domain/types.js';
import type { Notification } from '../../modules/notifications/domain/notification.js';
import type { Deps, EmailSender } from '../../ports.js';
import type { Clock } from '../../shared/clock.js';
import { ConflictError, PreconditionFailedError } from '../../shared/errors.js';
import { aiAdapters } from '../ai/mock-ai.js';
import { createLogEmailSender } from '../email/email-senders.js';

type Sql = postgres.Sql;
type Row = Record<string, any>;

export const toVector = (v: number[] | null): string | null => (v ? `[${v.join(',')}]` : null);
export const fromVector = (v: string | null): number[] | null => (v ? JSON.parse(v) : null);
const num = (v: unknown): number | null => (v == null ? null : Number(v));

const mapUser = (r: Row): User => ({
  id: r.id,
  email: r.email,
  fullName: r.full_name,
  role: r.role,
  organizationId: r.organization_id,
});

async function loadJobs(sql: Sql, where: postgres.PendingQuery<Row[]> | postgres.Fragment): Promise<Job[]> {
  const rows = await sql`SELECT *, embedding::text AS embedding_text FROM jobs.job WHERE ${where} ORDER BY published_at DESC NULLS LAST, id`;
  if (!rows.length) return [];
  const skills = await sql`SELECT * FROM jobs.job_skill WHERE job_id IN ${sql(rows.map((r) => r.id))} ORDER BY position`;
  return rows.map((r) => ({
    id: r.id,
    organizationId: r.organization_id,
    organizationName: r.organization_name,
    title: r.title,
    description: r.description,
    status: r.status,
    seniority: r.seniority,
    modality: r.modality,
    country: r.country,
    city: r.city,
    salaryMin: num(r.salary_min),
    salaryMax: num(r.salary_max),
    currency: r.currency,
    positionsTotal: r.positions_total,
    positionsFilled: r.positions_filled,
    applicantsCount: r.applicants_count,
    skills: skills
      .filter((s) => s.job_id === r.id)
      .map((s) => ({ skillId: s.skill_id, name: s.name, category: s.category, level: s.level, weight: Number(s.weight), mustHave: s.must_have })),
    embedding: fromVector(r.embedding_text),
    publishedAt: r.published_at,
    updatedAt: r.updated_at,
    closedAt: r.closed_at,
    sourceType: r.source_type,
    externalId: r.external_id,
    urgent: r.urgent ?? false,
  }));
}

/** Upsert de la vacante y reemplazo de sus skills (job_skill es hija; la vacante nunca se borra). */
export async function saveJob(sql: Sql, j: Job) {
  await sql.begin(async (tx) => {
    await tx`INSERT INTO jobs.job (id, organization_id, organization_name, title, description, status, seniority, modality, country, city,
        salary_min, salary_max, currency, positions_total, positions_filled, applicants_count, paid_simulated, embedding, published_at, updated_at,
        closed_at, source_type, external_id, urgent)
      VALUES (${j.id}, ${j.organizationId}, ${j.organizationName}, ${j.title}, ${j.description}, ${j.status}, ${j.seniority}, ${j.modality},
        ${j.country}, ${j.city}, ${j.salaryMin}, ${j.salaryMax}, ${j.currency}, ${j.positionsTotal}, ${j.positionsFilled}, ${j.applicantsCount},
        ${j.publishedAt !== null}, ${toVector(j.embedding)}::vector, ${j.publishedAt}, ${j.updatedAt}, ${j.closedAt}, ${j.sourceType}, ${j.externalId}, ${j.urgent})
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, status = EXCLUDED.status,
        seniority = EXCLUDED.seniority, modality = EXCLUDED.modality, country = EXCLUDED.country, city = EXCLUDED.city,
        salary_min = EXCLUDED.salary_min, salary_max = EXCLUDED.salary_max, currency = EXCLUDED.currency,
        positions_total = EXCLUDED.positions_total, paid_simulated = jobs.job.paid_simulated OR EXCLUDED.paid_simulated,
        embedding = EXCLUDED.embedding, published_at = EXCLUDED.published_at, updated_at = EXCLUDED.updated_at,
        closed_at = EXCLUDED.closed_at, external_id = EXCLUDED.external_id, urgent = EXCLUDED.urgent`;
    await tx`DELETE FROM jobs.job_skill WHERE job_id = ${j.id}`;
    for (const [i, s] of j.skills.entries()) {
      await tx`INSERT INTO jobs.job_skill (job_id, skill_id, name, category, level, weight, must_have, position)
        VALUES (${j.id}, ${s.skillId}, ${s.name}, ${s.category}, ${s.level}, ${s.weight}, ${s.mustHave}, ${i})`;
    }
  });
}

const mapNotification = (r: Row): Notification => ({
  id: r.id, userId: r.user_id, kind: r.kind, title: r.title, body: r.body, data: r.data, readAt: r.read_at, createdAt: r.created_at,
});

async function loadCandidates(sql: Sql, where: postgres.Fragment): Promise<Candidate[]> {
  const rows = await sql`SELECT *, embedding::text AS embedding_text FROM candidates.candidate WHERE ${where}`;
  if (!rows.length) return [];
  const skills = await sql`SELECT * FROM candidates.candidate_skill WHERE candidate_id IN ${sql(rows.map((r) => r.id))} ORDER BY skill_id`;
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    fullName: r.full_name,
    headline: r.headline,
    seniority: r.seniority,
    country: r.country,
    preferredModalities: r.preferred_modalities,
    salaryExpectation: num(r.salary_expectation),
    resumeText: r.resume_text,
    skills: skills
      .filter((s) => s.candidate_id === r.id)
      .map((s) => ({ skillId: s.skill_id, name: s.name, category: s.category, level: s.level, confirmed: s.confirmed, source: s.source, evidence: s.evidence })),
    embedding: fromVector(r.embedding_text),
    updatedAt: r.updated_at,
  }));
}

async function loadApplications(sql: Sql, where: postgres.Fragment): Promise<Application[]> {
  const rows = await sql`SELECT * FROM applications.application WHERE ${where}`;
  if (!rows.length) return [];
  const hist = await sql`SELECT * FROM applications.application_status_history WHERE application_id IN ${sql(rows.map((r) => r.id))} ORDER BY at, id`;
  return rows.map((r) => ({
    id: r.id,
    jobId: r.job_id,
    candidateId: r.candidate_id,
    organizationId: r.organization_id,
    status: r.status as ApplicationStatus,
    version: r.version,
    matchScore: num(r.match_score),
    createdAt: r.created_at,
    statusChangedAt: r.status_changed_at,
    history: hist
      .filter((h) => h.application_id === r.id)
      .map((h) => ({ from: h.from_status, to: h.to_status, actor: { kind: h.actor_kind, userId: h.actor_id }, reason: h.reason, at: h.at })),
  }));
}

/** Inserta las entradas del historial que aún no existen (append-only). */
async function appendHistory(sql: Sql, app: Application, alreadyStored: number) {
  for (const h of app.history.slice(alreadyStored)) {
    await sql`INSERT INTO applications.application_status_history (application_id, from_status, to_status, actor_kind, actor_id, reason, at)
      VALUES (${app.id}, ${h.from}, ${h.to}, ${h.actor.kind}, ${h.actor.userId}, ${h.reason}, ${h.at})`;
  }
}

export async function saveCandidate(sql: Sql, c: Candidate) {
  await sql.begin(async (tx) => {
    await tx`INSERT INTO candidates.candidate (id, user_id, full_name, headline, seniority, country, preferred_modalities, salary_expectation, resume_text, embedding, updated_at)
      VALUES (${c.id}, ${c.userId}, ${c.fullName}, ${c.headline}, ${c.seniority}, ${c.country}, ${c.preferredModalities}, ${c.salaryExpectation}, ${c.resumeText}, ${toVector(c.embedding)}::vector, ${c.updatedAt})
      ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, headline = EXCLUDED.headline, seniority = EXCLUDED.seniority,
        country = EXCLUDED.country, preferred_modalities = EXCLUDED.preferred_modalities, salary_expectation = EXCLUDED.salary_expectation,
        resume_text = EXCLUDED.resume_text, embedding = EXCLUDED.embedding, updated_at = EXCLUDED.updated_at`;
    await tx`DELETE FROM candidates.candidate_skill WHERE candidate_id = ${c.id}`;
    for (const s of c.skills) {
      await tx`INSERT INTO candidates.candidate_skill (candidate_id, skill_id, name, category, level, source, confirmed, evidence)
        VALUES (${c.id}, ${s.skillId}, ${s.name}, ${s.category}, ${s.level}, ${s.source}, ${s.confirmed}, ${s.evidence})`;
    }
  });
}

export function createPostgresDeps(databaseUrl: string, clock: Clock, email: EmailSender = createLogEmailSender()): { deps: Deps; close: () => Promise<void>; sql: Sql } {
  const sql = postgres(databaseUrl, { max: 10, idle_timeout: 30, onnotice: () => {} });

  const deps: Deps = {
    clock,
    email,
    ...aiAdapters(),
    users: {
      getById: async (id) => ((await sql`SELECT * FROM identity."user" WHERE id = ${id}`).map(mapUser)[0] ?? null),
      getByEmail: async (email) =>
        (await sql`SELECT * FROM identity."user" WHERE email = ${email.toLowerCase()}`).map(mapUser)[0] ?? null,
      create: async (u, hash) => {
        try {
          await sql`INSERT INTO identity."user" (id, email, full_name, role, organization_id, password_hash)
            VALUES (${u.id}, ${u.email}, ${u.fullName}, ${u.role}, ${u.organizationId}, ${hash})`;
        } catch (e) {
          if ((e as { code?: string }).code === '23505') throw new ConflictError('email-taken', 'Ya existe una cuenta con ese correo');
          throw e;
        }
      },
      getPasswordHash: async (id) => ((await sql`SELECT password_hash FROM identity."user" WHERE id = ${id}`)[0]?.password_hash as string | null) ?? null,
    },
    organizations: {
      get: async (id) => {
        const [r] = await sql`SELECT id, name FROM identity.organization WHERE id = ${id}`;
        return r ? { id: r.id, name: r.name } : null;
      },
      create: async (o) => void (await sql`INSERT INTO identity.organization (id, name) VALUES (${o.id}, ${o.name})`),
    },
    notifications: {
      create: async (n) => {
        await sql`INSERT INTO notifications.notification (id, user_id, kind, title, body, data, read_at, created_at)
          VALUES (${n.id}, ${n.userId}, ${n.kind}, ${n.title}, ${n.body}, ${sql.json(n.data as never)}, ${n.readAt}, ${n.createdAt})`;
      },
      listByUser: async (userId, opts = {}) =>
        (await sql`SELECT * FROM notifications.notification WHERE user_id = ${userId}
          ${opts.unreadOnly ? sql`AND read_at IS NULL` : sql``} ORDER BY created_at DESC, id DESC LIMIT ${opts.limit ?? 50}`).map(mapNotification),
      countUnread: async (userId) =>
        Number((await sql`SELECT count(*)::int AS n FROM notifications.notification WHERE user_id = ${userId} AND read_at IS NULL`)[0]?.n ?? 0),
      markRead: async (id, userId, at) => {
        const res = await sql`UPDATE notifications.notification SET read_at = COALESCE(read_at, ${at}) WHERE id = ${id} AND user_id = ${userId}`;
        return res.count > 0;
      },
      markAllRead: async (userId, at) => {
        await sql`UPDATE notifications.notification SET read_at = ${at} WHERE user_id = ${userId} AND read_at IS NULL`;
      },
    },
    skills: {
      list: async () =>
        (await sql`SELECT * FROM matching.skill ORDER BY category, name`).map((r) => ({
          id: r.id,
          name: r.name,
          category: r.category,
          aliases: r.aliases,
        })),
    },
    jobs: {
      get: async (id) => (await loadJobs(sql, sql`id = ${id}`))[0] ?? null,
      listPublished: () => loadJobs(sql, sql`status = 'published'`),
      listByOrganization: (org) => loadJobs(sql, sql`organization_id = ${org}`),
      incrementApplicants: async (id, delta) => {
        await sql`UPDATE jobs.job SET applicants_count = GREATEST(0, applicants_count + ${delta}) WHERE id = ${id}`;
      },
      incrementPositionsFilled: async (id) => {
        await sql`UPDATE jobs.job SET positions_filled = LEAST(positions_total, positions_filled + 1) WHERE id = ${id}`;
      },
      findByExternalId: async (org, ext) => (await loadJobs(sql, sql`organization_id = ${org} AND external_id = ${ext}`))[0] ?? null,
      save: (j) => saveJob(sql, j),
    },
    candidates: {
      get: async (id) => (await loadCandidates(sql, sql`id = ${id}`))[0] ?? null,
      getByUserId: async (userId) => (await loadCandidates(sql, sql`user_id = ${userId}`))[0] ?? null,
      getMany: (ids) => (ids.length ? loadCandidates(sql, sql`id IN ${sql(ids)}`) : Promise.resolve([])),
      save: (c) => saveCandidate(sql, c),
    },
    applications: {
      get: async (id) => (await loadApplications(sql, sql`id = ${id}`))[0] ?? null,
      findByJobAndCandidate: async (jobId, candidateId) =>
        (await loadApplications(sql, sql`job_id = ${jobId} AND candidate_id = ${candidateId}`))[0] ?? null,
      listByCandidate: (cid) => loadApplications(sql, sql`candidate_id = ${cid}`),
      listByJob: (jid) => loadApplications(sql, sql`job_id = ${jid}`),
      listByOrganization: (org) => loadApplications(sql, sql`organization_id = ${org}`),
      create: async (a) => {
        try {
          await sql.begin(async (tx) => {
            await tx`INSERT INTO applications.application (id, job_id, candidate_id, organization_id, status, version, match_score, created_at, status_changed_at)
              VALUES (${a.id}, ${a.jobId}, ${a.candidateId}, ${a.organizationId}, ${a.status}, ${a.version}, ${a.matchScore}, ${a.createdAt}, ${a.statusChangedAt})`;
            await appendHistory(tx as unknown as Sql, a, 0);
          });
        } catch (e) {
          if ((e as { code?: string }).code === '23505') throw new ConflictError('already-applied', 'Ya te postulaste a esta vacante');
          throw e;
        }
      },
      update: async (a, expectedVersion) => {
        await sql.begin(async (tx) => {
          const res = await tx`UPDATE applications.application SET status = ${a.status}, version = ${a.version},
              status_changed_at = ${a.statusChangedAt} WHERE id = ${a.id} AND version = ${expectedVersion}`;
          if (res.count === 0) throw new PreconditionFailedError();
          const [{ n }] = (await tx`SELECT count(*)::int AS n FROM applications.application_status_history WHERE application_id = ${a.id}`) as Row[] as [{ n: number }];
          await appendHistory(tx as unknown as Sql, a, n);
        });
      },
    },
    matchCache: {
      get: async (c, j, v) => {
        const [r] = await sql`SELECT result, computed_at FROM matching.match_score WHERE candidate_id = ${c} AND job_id = ${j} AND model_version = ${v}`;
        return r ? { result: r.result as MatchResult, computedAt: r.computed_at } : null;
      },
      put: async (result, computedAt) => {
        await sql`INSERT INTO matching.match_score (candidate_id, job_id, score, result, model_version, computed_at)
          VALUES (${result.candidateId}, ${result.jobId}, ${result.score}, ${sql.json(result as never)}, ${result.modelVersion}, ${computedAt})
          ON CONFLICT (candidate_id, job_id) DO UPDATE SET score = EXCLUDED.score, result = EXCLUDED.result,
            model_version = EXCLUDED.model_version, computed_at = EXCLUDED.computed_at`;
      },
      invalidateCandidate: async (cid) => void (await sql`DELETE FROM matching.match_score WHERE candidate_id = ${cid}`),
      invalidateJob: async (jid) => void (await sql`DELETE FROM matching.match_score WHERE job_id = ${jid}`),
    },
  };

  return { deps, sql, close: () => sql.end({ timeout: 5 }) };
}
