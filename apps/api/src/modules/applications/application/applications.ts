import type { Deps } from '../../../ports.js';
import { ConflictError, ForbiddenError, NotFoundError, PreconditionFailedError } from '../../../shared/errors.js';
import { newId } from '../../../shared/ids.js';
import type { User } from '../../identity/domain/user.js';
import { isEmployer } from '../../identity/domain/user.js';
import { toJobView } from '../../jobs/application/jobs.js';
import { computeAndCacheMatch } from '../../matching/application/get-job-match.js';
import { notifyUser } from '../../notifications/application/notifications.js';
import { statusChangeMessage } from '../../notifications/domain/notification.js';
import { staleDays, STALE_DAYS, type Application } from '../domain/application.js';
import { ACTIVE_STATUSES, canTransition, isTerminal, type Actor, type RecruiterSettableStatus } from '../domain/status.js';
import { toStepper } from '../domain/stepper.js';

const toApplicationView = (a: Application) => ({
  id: a.id,
  jobId: a.jobId,
  candidateId: a.candidateId,
  status: a.status,
  version: a.version,
  matchScore: a.matchScore,
  createdAt: a.createdAt.toISOString(),
  statusChangedAt: a.statusChangedAt.toISOString(),
});

/** POST /v1/jobs/{jobId}/applications — postular (HU-02 / applications-pipeline). */
export async function applyToJob(deps: Deps, userId: string, jobId: string) {
  const candidate = await deps.candidates.getByUserId(userId);
  if (!candidate) throw new NotFoundError('Perfil de candidato');
  const job = await deps.jobs.get(jobId);
  if (!job || job.status !== 'published') throw new NotFoundError('Vacante');
  if (await deps.applications.findByJobAndCandidate(jobId, candidate.id)) {
    throw new ConflictError('already-applied', 'Ya te postulaste a esta vacante');
  }

  const { result } = await computeAndCacheMatch(deps, candidate, job);
  const now = deps.clock.now();
  const actor: Actor = { kind: 'candidate', userId };
  const app: Application = {
    id: newId('app', now.getTime()),
    jobId,
    candidateId: candidate.id,
    organizationId: job.organizationId,
    status: 'submitted',
    version: 1,
    matchScore: result.score,
    createdAt: now,
    statusChangedAt: now,
    history: [{ from: null, to: 'submitted', actor, reason: null, at: now }],
  };
  await deps.applications.create(app);
  await deps.jobs.incrementApplicants(jobId, 1);
  return toApplicationView(app);
}

async function loadForEmployer(deps: Deps, user: User, applicationId: string): Promise<Application> {
  if (!isEmployer(user) || !user.organizationId) throw new ForbiddenError();
  const app = await deps.applications.get(applicationId);
  // Aislamiento por organización: una postulación de otra org se reporta como inexistente.
  if (!app || app.organizationId !== user.organizationId) throw new NotFoundError('Postulación');
  return app;
}

/** PATCH /v1/applications/{id}/status — el reclutador cambia el estatus (If-Match obligatorio). */
export async function changeApplicationStatus(
  deps: Deps,
  user: User,
  input: { applicationId: string; to: RecruiterSettableStatus; expectedVersion: number; reason?: string | null },
) {
  const app = await loadForEmployer(deps, user, input.applicationId);
  if (app.version !== input.expectedVersion) throw new PreconditionFailedError();
  const actor: Actor = { kind: 'recruiter', userId: user.id };
  if (!canTransition(app.status, input.to, actor)) {
    throw new ConflictError('invalid-transition', `No se puede pasar de ${app.status} a ${input.to}`, {
      from: app.status,
      to: input.to,
    });
  }
  const now = deps.clock.now();
  const updated: Application = {
    ...app,
    status: input.to,
    version: app.version + 1,
    statusChangedAt: now,
    history: [...app.history, { from: app.status, to: input.to, actor, reason: input.reason ?? null, at: now }],
  };
  await deps.applications.update(updated, app.version);
  if (input.to === 'hired') await deps.jobs.incrementPositionsFilled(app.jobId);
  await notifyCandidateOfStatus(deps, updated);
  return toApplicationView(updated);
}

/** Avisa al candidato del nuevo estatus: in-app siempre; email en selección, oferta, contratación o rechazo. */
async function notifyCandidateOfStatus(deps: Deps, app: Application) {
  const [candidate, job] = await Promise.all([deps.candidates.get(app.candidateId), deps.jobs.get(app.jobId)]);
  if (!candidate) return;
  const msg = statusChangeMessage(app.status, job?.title ?? 'la vacante');
  await notifyUser(deps, candidate.userId, {
    ...msg,
    data: { jobId: app.jobId, applicationId: app.id, status: app.status, jobTitle: job?.title, organizationName: job?.organizationName },
  });
}

/** POST /v1/applications/{id}/withdraw — solo el candidato dueño. */
export async function withdrawApplication(deps: Deps, userId: string, applicationId: string) {
  const candidate = await deps.candidates.getByUserId(userId);
  const app = await deps.applications.get(applicationId);
  if (!candidate || !app || app.candidateId !== candidate.id) throw new NotFoundError('Postulación');
  const actor: Actor = { kind: 'candidate', userId };
  if (!canTransition(app.status, 'withdrawn', actor)) {
    throw new ConflictError('invalid-transition', `No se puede retirar una postulación en ${app.status}`);
  }
  const now = deps.clock.now();
  const updated: Application = {
    ...app,
    status: 'withdrawn',
    version: app.version + 1,
    statusChangedAt: now,
    history: [...app.history, { from: app.status, to: 'withdrawn', actor, reason: null, at: now }],
  };
  await deps.applications.update(updated, app.version);
  await deps.jobs.incrementApplicants(app.jobId, -1);
  return toApplicationView(updated);
}

/** GET /v1/bff/candidate/dashboard — postulaciones con stepper + vacantes recomendadas (1 llamada). */
export async function candidateDashboard(deps: Deps, userId: string) {
  const candidate = await deps.candidates.getByUserId(userId);
  if (!candidate) throw new NotFoundError('Perfil de candidato');
  const [apps, published] = await Promise.all([deps.applications.listByCandidate(candidate.id), deps.jobs.listPublished()]);
  const jobsById = new Map(published.map((j) => [j.id, j]));
  // Vacantes cerradas también deben mostrarse en el historial del candidato.
  for (const a of apps) {
    if (!jobsById.has(a.jobId)) {
      const j = await deps.jobs.get(a.jobId);
      if (j) jobsById.set(j.id, j);
    }
  }

  const applications = apps
    .sort((a, b) => b.statusChangedAt.getTime() - a.statusChangedAt.getTime())
    .map((a) => {
      const job = jobsById.get(a.jobId);
      return {
        ...toApplicationView(a),
        job: job ? { id: job.id, title: job.title, organizationName: job.organizationName, status: job.status } : null,
        stepper: toStepper(a.status, a.history),
      };
    });

  const appliedJobIds = new Set(apps.map((a) => a.jobId));
  const hasConfirmedSkills = candidate.skills.some((s) => s.confirmed);
  const recommended = hasConfirmedSkills
    ? (
        await Promise.all(
          published
            .filter((j) => !appliedJobIds.has(j.id))
            .map(async (j) => ({ job: j, match: (await computeAndCacheMatch(deps, candidate, j)).result })),
        )
      )
        .sort((a, b) => b.match.score - a.match.score)
        .slice(0, 3)
        .map(({ job, match }) => ({ ...toJobView(job), matchScore: match.score, scorePercent: match.scorePercent }))
    : [];

  return {
    candidate: { id: candidate.id, fullName: candidate.fullName, hasConfirmedSkills },
    summary: {
      total: apps.length,
      active: apps.filter((a) => !isTerminal(a.status)).length,
    },
    applications,
    recommendedJobs: recommended,
  };
}

/** GET /v1/jobs/{jobId}/applications — candidatos de la vacante ordenados por match. */
export async function listJobApplications(deps: Deps, user: User, jobId: string) {
  if (!isEmployer(user) || !user.organizationId) throw new ForbiddenError();
  const job = await deps.jobs.get(jobId);
  if (!job || job.organizationId !== user.organizationId) throw new NotFoundError('Vacante');
  const apps = await deps.applications.listByJob(jobId);
  const candidates = new Map((await deps.candidates.getMany(apps.map((a) => a.candidateId))).map((c) => [c.id, c]));
  const now = deps.clock.now();
  return apps
    .map((a) => {
      const c = candidates.get(a.candidateId);
      return {
        ...toApplicationView(a),
        candidate: c ? { id: c.id, fullName: c.fullName, headline: c.headline, seniority: c.seniority } : null,
        staleDays: isTerminal(a.status) ? 0 : staleDays(a, now),
      };
    })
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
}

/** GET /v1/bff/employer/dashboard — vacantes con posiciones/postulantes y postulaciones estancadas (3/5 días). */
export async function employerDashboard(deps: Deps, user: User) {
  if (!isEmployer(user) || !user.organizationId) throw new ForbiddenError();
  const [jobs, apps] = await Promise.all([
    deps.jobs.listByOrganization(user.organizationId),
    deps.applications.listByOrganization(user.organizationId),
  ]);
  const now = deps.clock.now();
  const titles = new Map(jobs.map((j) => [j.id, j.title]));
  const stale = apps
    // Las postulaciones de vacantes cerradas no cuentan como estancadas.
    .filter((a) => ACTIVE_STATUSES.includes(a.status) && titles.has(a.jobId) && jobs.find((j) => j.id === a.jobId)?.status !== 'closed')
    .filter((a) => staleDays(a, now) >= STALE_DAYS.warning)
    .map((a) => ({
      applicationId: a.id,
      jobId: a.jobId,
      jobTitle: titles.get(a.jobId) ?? null,
      status: a.status,
      version: a.version,
      staleDays: staleDays(a, now),
      level: staleDays(a, now) >= STALE_DAYS.escalation ? ('escalated' as const) : ('warning' as const),
    }))
    .sort((a, b) => b.staleDays - a.staleDays);

  return {
    jobs: jobs.map((j) => ({
      ...toJobView(j),
      pipeline: Object.fromEntries(
        ACTIVE_STATUSES.map((s) => [s, apps.filter((a) => a.jobId === j.id && a.status === s).length]),
      ),
    })),
    staleApplications: stale,
  };
}
