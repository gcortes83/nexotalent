import { createHash } from 'node:crypto';
import type { Deps } from '../../../ports.js';
import { NotFoundError } from '../../../shared/errors.js';
import { toMatchCandidate, type Candidate } from '../../candidates/domain/candidate.js';
import { toMatchJob, type Job } from '../../jobs/domain/job.js';
import { cosineSimilarity } from '../domain/embedding.js';
import { computeMatch, MATCH_MODEL_VERSION } from '../domain/match-formula.js';
import type { MatchResult } from '../domain/types.js';

export interface JobMatchView {
  result: MatchResult;
  computedAt: Date;
  etag: string;
  cached: boolean;
}

export const matchEtag = (modelVersion: string, computedAt: Date): string =>
  `"${createHash('sha256').update(`${modelVersion}:${computedAt.toISOString()}`).digest('base64url').slice(0, 22)}"`;

/** Calcula (o lee de caché) el match candidato × vacante. */
export async function computeAndCacheMatch(deps: Deps, candidate: Candidate, job: Job): Promise<JobMatchView> {
  const hit = await deps.matchCache.get(candidate.id, job.id, MATCH_MODEL_VERSION);
  if (hit) return { ...hit, etag: matchEtag(hit.result.modelVersion, hit.computedAt), cached: true };

  const similarity = cosineSimilarity(candidate.embedding, job.embedding);
  const result = computeMatch(toMatchCandidate(candidate), toMatchJob(job), similarity);
  const computedAt = deps.clock.now();
  await deps.matchCache.put(result, computedAt);
  return { result, computedAt, etag: matchEtag(result.modelVersion, computedAt), cached: false };
}

/** GET /v1/jobs/{jobId}/match — TK-BE-012. */
export async function getJobMatch(deps: Deps, userId: string, jobId: string): Promise<JobMatchView> {
  const candidate = await deps.candidates.getByUserId(userId);
  if (!candidate) throw new NotFoundError('Perfil de candidato');
  const job = await deps.jobs.get(jobId);
  if (!job || job.status !== 'published') throw new NotFoundError('Vacante');
  return computeAndCacheMatch(deps, candidate, job);
}
