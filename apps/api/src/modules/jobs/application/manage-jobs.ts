/**
 * Gestión de vacantes por el empleador: crear, editar, publicar (pago simulado) y cerrar (soft delete).
 * Al cerrar se notifica a los candidatos con postulación activa (in-app + email).
 */
import { z } from 'zod';
import type { Deps } from '../../../ports.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors.js';
import { newId } from '../../../shared/ids.js';
import { isTerminal } from '../../applications/domain/status.js';
import type { Skill } from '../../candidates/domain/skill.js';
import { isEmployer, type User } from '../../identity/domain/user.js';
import { profileText } from '../../matching/domain/embedding.js';
import type { RequiredSkill } from '../../matching/domain/types.js';
import { jobClosedMessage } from '../../notifications/domain/notification.js';
import { notifyUser } from '../../notifications/application/notifications.js';
import { CLOSABLE_STATUSES, EDITABLE_STATUSES, type Job, type JobSource } from '../domain/job.js';
import { normalizeModality, normalizeSeniority } from '../domain/job-import.js';
import { toJobView } from './jobs.js';

/** Categoría de la taxonomía que agrupa las habilidades blandas. */
export const SOFT_SKILLS_CATEGORY = 'Soft skills';

/** Todas las vacantes publican el salario mensual en dólares estadounidenses. */
export const JOB_CURRENCY = 'USD';

const optionalMoney = z.preprocess((v) => (v === '' || v === undefined ? null : v), z.coerce.number().int().min(0).max(10_000_000).nullable());

export const jobInputSchema = z
  .object({
    externalId: z.string().trim().max(120).nullish(),
    title: z.string().trim().min(3, 'El título es obligatorio').max(160),
    description: z.string().trim().min(10, 'Describe la vacante (mínimo 10 caracteres)').max(10_000),
    seniority: z.preprocess((v) => normalizeSeniority(v as string), z.enum(['junior', 'mid', 'senior', 'lead'], 'Nivel inválido (junior, mid, senior, lead)')),
    modality: z.preprocess((v) => normalizeModality(v as string), z.enum(['onsite', 'hybrid', 'remote'], 'Modalidad inválida (onsite, hybrid, remote)')),
    country: z.string().trim().length(2, 'País: código ISO de 2 letras (MX, CO…)').toUpperCase(),
    city: z.string().trim().max(120).nullish().transform((v) => v || null),
    salaryMin: optionalMoney.optional().default(null),
    salaryMax: optionalMoney.optional().default(null),
    // Moneda única: dólares estadounidenses (salario mensual).
    currency: z.string().trim().toUpperCase().default(JOB_CURRENCY).refine((c) => c === JOB_CURRENCY, 'La moneda del salario debe ser USD (dólares estadounidenses)'),
    positionsTotal: z.coerce.number().int().min(1, 'Al menos 1 posición').max(1000),
    urgent: z.boolean().optional().default(false),
    skills: z
      .array(z.object({ name: z.string().trim().min(1), level: z.coerce.number().int().min(1).max(5), mustHave: z.boolean().optional().default(false) }))
      .max(30)
      .default([]),
    /** Soft skills opcionales (categoría «Soft skills» de la taxonomía). Se guardan junto con las skills. */
    softSkills: z
      .array(z.object({ name: z.string().trim().min(1), level: z.coerce.number().int().min(1).max(5), mustHave: z.boolean().optional().default(false) }))
      .max(10)
      .default([]),
  })
  .refine((j) => j.salaryMin == null || j.salaryMax == null || j.salaryMin <= j.salaryMax, {
    message: 'El salario mínimo no puede ser mayor que el máximo',
    path: ['salaryMin'],
  });

export type JobInput = z.infer<typeof jobInputSchema>;

export const toEmployerJobView = (j: Job) => ({
  ...toJobView(j),
  externalId: j.externalId,
  sourceType: j.sourceType,
  updatedAt: j.updatedAt.toISOString(),
  skills: j.skills.map(({ skillId, name, category, level, mustHave }) => ({ skillId, name, category, level, mustHave })),
});

function requireEmployer(user: User): string {
  if (!isEmployer(user) || !user.organizationId) throw new ForbiddenError();
  return user.organizationId;
}

async function loadOwnJob(deps: Deps, user: User, jobId: string): Promise<Job> {
  const org = requireEmployer(user);
  const job = await deps.jobs.get(jobId);
  if (!job || job.organizationId !== org) throw new NotFoundError('Vacante');
  return job;
}

/** Resuelve skills por nombre o alias contra la taxonomía; devuelve las desconocidas aparte. */
export function resolveSkills(input: JobInput['skills'], taxonomy: Skill[]): { skills: RequiredSkill[]; unknown: string[] } {
  const index = new Map<string, Skill>();
  for (const s of taxonomy) for (const k of [s.name, ...s.aliases]) index.set(k.toLowerCase(), s);
  const skills: RequiredSkill[] = [];
  const unknown: string[] = [];
  for (const i of input) {
    const s = index.get(i.name.toLowerCase());
    if (!s) unknown.push(i.name);
    else if (!skills.some((x) => x.skillId === s.id)) {
      skills.push({ skillId: s.id, name: s.name, category: s.category, level: i.level, weight: i.mustHave ? 2 : 1, mustHave: i.mustHave });
    }
  }
  return { skills, unknown };
}

/** Construye la vacante a partir de la entrada validada (nueva o actualizando `existing`). */
export async function buildJob(
  deps: Deps,
  user: User,
  input: JobInput,
  opts: { existing?: Job; source: JobSource; publish: boolean; strictSkills: boolean },
): Promise<{ job: Job; unknownSkills: string[] }> {
  const org = requireEmployer(user);
  const taxonomy = await deps.skills.list();
  const { skills: technical, unknown } = resolveSkills(input.skills, taxonomy);
  const soft = resolveSkills(input.softSkills, taxonomy);
  const notSoft = soft.skills.filter((s) => s.category !== SOFT_SKILLS_CATEGORY).map((s) => s.name);
  if (opts.strictSkills && unknown.length) throw new ValidationError(`Skills desconocidas: ${unknown.join(', ')}`, { unknown });
  if (opts.strictSkills && (soft.unknown.length || notSoft.length)) {
    throw new ValidationError(`No son soft skills de la taxonomía: ${[...soft.unknown, ...notSoft].join(', ')}`, { unknown: soft.unknown, notSoft });
  }
  unknown.push(...soft.unknown);
  const skills = [...technical];
  for (const s of soft.skills) if (!skills.some((x) => x.skillId === s.skillId)) skills.push(s);
  const organization = await deps.organizations.get(org);
  const now = deps.clock.now();
  const base = opts.existing;
  const publish = opts.publish || base?.status === 'published';
  const job: Job = {
    id: base?.id ?? newId('job', now.getTime()),
    organizationId: org,
    organizationName: organization?.name ?? base?.organizationName ?? 'Empresa',
    title: input.title,
    description: input.description,
    status: publish ? 'published' : (base?.status ?? 'draft'),
    seniority: input.seniority,
    modality: input.modality,
    country: input.country,
    city: input.city ?? null,
    salaryMin: input.salaryMin ?? null,
    salaryMax: input.salaryMax ?? null,
    currency: input.currency,
    positionsTotal: Math.max(input.positionsTotal, base?.positionsFilled ?? 0),
    positionsFilled: base?.positionsFilled ?? 0,
    applicantsCount: base?.applicantsCount ?? 0,
    skills,
    embedding: await deps.embedder.embed(profileText(input.title, skills)),
    publishedAt: publish ? (base?.publishedAt ?? now) : null,
    updatedAt: now,
    closedAt: null,
    sourceType: base?.sourceType ?? opts.source,
    externalId: input.externalId ?? base?.externalId ?? null,
    urgent: input.urgent,
  };
  return { job, unknownSkills: unknown };
}

export async function listEmployerJobs(deps: Deps, user: User) {
  const jobs = await deps.jobs.listByOrganization(requireEmployer(user));
  return jobs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).map(toEmployerJobView);
}

export async function getEmployerJob(deps: Deps, user: User, jobId: string) {
  return toEmployerJobView(await loadOwnJob(deps, user, jobId));
}

export async function createJob(deps: Deps, user: User, input: JobInput, publish: boolean) {
  if (input.externalId && (await deps.jobs.findByExternalId(requireEmployer(user), input.externalId))) {
    throw new ConflictError('external-id-taken', `Ya existe una vacante con el id externo ${input.externalId}`);
  }
  const { job } = await buildJob(deps, user, input, { source: 'manual', publish, strictSkills: true });
  await deps.jobs.save(job);
  return toEmployerJobView(job);
}

export async function updateJob(deps: Deps, user: User, jobId: string, input: JobInput) {
  const existing = await loadOwnJob(deps, user, jobId);
  if (!EDITABLE_STATUSES.includes(existing.status)) {
    throw new ConflictError('job-not-editable', `No se puede editar una vacante en estado ${existing.status}`);
  }
  const { job } = await buildJob(deps, user, input, { existing, source: existing.sourceType, publish: false, strictSkills: true });
  await deps.jobs.save(job);
  await deps.matchCache.invalidateJob(job.id);
  return toEmployerJobView(job);
}

/** Publica (pago simulado en el MVP: `paid_simulated`). */
export async function publishJob(deps: Deps, user: User, jobId: string) {
  const job = await loadOwnJob(deps, user, jobId);
  if (job.status === 'published') return toEmployerJobView(job);
  if (!['draft', 'pending_payment', 'on_hold'].includes(job.status)) {
    throw new ConflictError('job-not-publishable', `No se puede publicar una vacante en estado ${job.status}`);
  }
  if (!job.skills.length) throw new ValidationError('Agrega al menos una skill antes de publicar');
  const now = deps.clock.now();
  const updated: Job = { ...job, status: 'published', publishedAt: job.publishedAt ?? now, updatedAt: now };
  await deps.jobs.save(updated);
  return toEmployerJobView(updated);
}

/**
 * Cierra la vacante (soft delete: la fila y las postulaciones se conservan) y notifica a los
 * candidatos con postulación activa, in-app y por correo.
 */
export async function closeJob(deps: Deps, user: User, jobId: string) {
  const job = await loadOwnJob(deps, user, jobId);
  if (!CLOSABLE_STATUSES.includes(job.status)) {
    throw new ConflictError('job-not-closable', `La vacante ya está en estado ${job.status}`);
  }
  const now = deps.clock.now();
  const closed: Job = { ...job, status: 'closed', closedAt: now, updatedAt: now };
  await deps.jobs.save(closed);
  await deps.matchCache.invalidateJob(job.id);

  const apps = (await deps.applications.listByJob(job.id)).filter((a) => !isTerminal(a.status));
  const candidates = await deps.candidates.getMany(apps.map((a) => a.candidateId));
  const msg = jobClosedMessage(job.title, job.organizationName);
  for (const a of apps) {
    const c = candidates.find((x) => x.id === a.candidateId);
    if (c) {
      await notifyUser(deps, c.userId, {
        ...msg,
        data: { jobId: job.id, applicationId: a.id, jobTitle: job.title, organizationName: job.organizationName },
        email: true,
      });
    }
  }
  return { ...toEmployerJobView(closed), notifiedCandidates: apps.length };
}
