import type { Deps } from '../../../ports.js';
import { NotFoundError } from '../../../shared/errors.js';
import { positionsAvailable, type Job } from '../domain/job.js';
import { type JobSearchFilters, searchJobs } from '../domain/job-search.js';

export const toJobView = (j: Job) => ({
  id: j.id,
  organizationName: j.organizationName,
  title: j.title,
  description: j.description,
  status: j.status,
  seniority: j.seniority,
  modality: j.modality,
  country: j.country,
  city: j.city,
  salary: j.salaryMax == null ? null : { min: j.salaryMin, max: j.salaryMax, currency: j.currency },
  positionsTotal: j.positionsTotal,
  positionsAvailable: positionsAvailable(j),
  applicantsCount: j.applicantsCount,
  skills: j.skills.map(({ name, category, level, mustHave }) => ({ name, category, level, mustHave })),
  publishedAt: j.publishedAt?.toISOString() ?? null,
  closedAt: j.closedAt?.toISOString() ?? null,
  urgent: j.urgent,
});

export async function listPublishedJobs(deps: Deps, q?: string) {
  const jobs = await deps.jobs.listPublished();
  const needle = q?.trim().toLowerCase();
  const filtered = needle
    ? jobs.filter((j) => `${j.title} ${j.description} ${j.skills.map((s) => s.name).join(' ')}`.toLowerCase().includes(needle))
    : jobs;
  return filtered.map(toJobView);
}

export async function getPublishedJob(deps: Deps, jobId: string) {
  const job = await deps.jobs.get(jobId);
  if (!job || job.status !== 'published') throw new NotFoundError('Vacante');
  return toJobView(job);
}

/** GET /v1/jobs con filtros, orden, paginación y facetas. */
export async function searchPublishedJobs(deps: Deps, filters: JobSearchFilters) {
  const { jobs, ...rest } = searchJobs(await deps.jobs.listPublished(), filters);
  return { items: jobs.map(toJobView), ...rest };
}
