import postgres from 'postgres';
import type { SeedData } from '../../seed/seed-data.js';
import { saveCandidate, toVector } from './postgres-adapters.js';

/** Carga idempotente de los datos sintéticos (borra y recrea solo filas con ids del seed). */
export async function seedDatabase(databaseUrl: string, data: SeedData): Promise<void> {
  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    await sql.begin(async (tx) => {
      await tx`TRUNCATE notifications.notification, applications.application_status_history, applications.application, matching.match_score,
        candidates.candidate_skill, candidates.candidate, jobs.job_skill, jobs.job, matching.skill,
        identity."user", identity.organization RESTART IDENTITY`;
      for (const o of data.organizations) await tx`INSERT INTO identity.organization (id, name) VALUES (${o.id}, ${o.name})`;
      for (const u of data.users) {
        await tx`INSERT INTO identity."user" (id, email, full_name, role, organization_id, password_hash)
          VALUES (${u.id}, ${u.email}, ${u.fullName}, ${u.role}, ${u.organizationId}, ${data.passwordHashes[u.id] ?? null})`;
      }
      for (const s of data.skills) {
        await tx`INSERT INTO matching.skill (id, name, category, aliases) VALUES (${s.id}, ${s.name}, ${s.category}, ${s.aliases})`;
      }
      for (const j of data.jobs) {
        await tx`INSERT INTO jobs.job (id, organization_id, organization_name, title, description, status, seniority, modality, country, city,
            salary_min, salary_max, currency, positions_total, positions_filled, applicants_count, paid_simulated, embedding, published_at, updated_at,
            closed_at, source_type, external_id, urgent)
          VALUES (${j.id}, ${j.organizationId}, ${j.organizationName}, ${j.title}, ${j.description}, ${j.status}, ${j.seniority}, ${j.modality},
            ${j.country}, ${j.city}, ${j.salaryMin}, ${j.salaryMax}, ${j.currency}, ${j.positionsTotal}, ${j.positionsFilled}, ${j.applicantsCount},
            ${j.status === 'published'}, ${toVector(j.embedding)}::vector, ${j.publishedAt}, ${j.updatedAt},
            ${j.closedAt}, ${j.sourceType}, ${j.externalId}, ${j.urgent})`;
        for (const [i, s] of j.skills.entries()) {
          await tx`INSERT INTO jobs.job_skill (job_id, skill_id, name, category, level, weight, must_have, position)
            VALUES (${j.id}, ${s.skillId}, ${s.name}, ${s.category}, ${s.level}, ${s.weight}, ${s.mustHave}, ${i})`;
        }
      }
    });
    for (const c of data.candidates) await saveCandidate(sql, c);
    for (const a of data.applications) {
      await sql`INSERT INTO applications.application (id, job_id, candidate_id, organization_id, status, version, match_score, created_at, status_changed_at)
        VALUES (${a.id}, ${a.jobId}, ${a.candidateId}, ${a.organizationId}, ${a.status}, ${a.version}, ${a.matchScore}, ${a.createdAt}, ${a.statusChangedAt})`;
      for (const h of a.history) {
        await sql`INSERT INTO applications.application_status_history (application_id, from_status, to_status, actor_kind, actor_id, reason, at)
          VALUES (${a.id}, ${h.from}, ${h.to}, ${h.actor.kind}, ${h.actor.userId}, ${h.reason}, ${h.at})`;
      }
    }
  } finally {
    await sql.end();
  }
}
