import { z } from 'zod';
import type { Deps } from '../../../ports.js';
import { NotFoundError, ValidationError } from '../../../shared/errors.js';
import { profileText } from '../../matching/domain/embedding.js';
import type { Candidate, CandidateSkillRecord } from '../domain/candidate.js';

export const MAX_RESUME_CHARS = 30_000;

async function requireCandidate(deps: Deps, userId: string): Promise<Candidate> {
  const c = await deps.candidates.getByUserId(userId);
  if (!c) throw new NotFoundError('Perfil de candidato');
  return c;
}

/**
 * HU-04 (núcleo): el candidato sube el texto de su CV, la IA propone skills
 * (sin confirmar) y el candidato decide. Reemplaza propuestas previas no confirmadas.
 */
export async function submitResume(deps: Deps, userId: string, resumeText: string) {
  const text = resumeText.trim();
  if (text.length < 30) throw new ValidationError('El CV es demasiado corto para extraer skills');
  if (text.length > MAX_RESUME_CHARS) throw new ValidationError(`El CV supera ${MAX_RESUME_CHARS} caracteres`);

  const candidate = await requireCandidate(deps, userId);
  const taxonomy = await deps.skills.list();
  const byId = new Map(taxonomy.map((s) => [s.id, s]));
  const extracted = await deps.extractor.extract(text, taxonomy);

  const confirmed = candidate.skills.filter((s) => s.confirmed);
  const confirmedIds = new Set(confirmed.map((s) => s.skillId));
  const proposals: CandidateSkillRecord[] = extracted
    .filter((e) => byId.has(e.skillId) && !confirmedIds.has(e.skillId))
    .map((e) => {
      const s = byId.get(e.skillId)!;
      return { skillId: s.id, name: s.name, category: s.category, level: e.level, confirmed: false, source: 'extracted', evidence: e.evidence };
    });

  const updated: Candidate = { ...candidate, resumeText: text, skills: [...confirmed, ...proposals], updatedAt: deps.clock.now() };
  await deps.candidates.save(updated);
  return { proposedSkills: proposals, confirmedSkills: confirmed };
}

/**
 * El candidato confirma la lista final de skills (con niveles). Solo estas cuentan para el match.
 * Recalcula el embedding del perfil e invalida la caché de match.
 */
export async function confirmSkills(deps: Deps, userId: string, input: { skillId: string; level: number }[]) {
  const candidate = await requireCandidate(deps, userId);
  const taxonomy = new Map((await deps.skills.list()).map((s) => [s.id, s]));
  const unknown = input.filter((i) => !taxonomy.has(i.skillId)).map((i) => i.skillId);
  if (unknown.length) throw new ValidationError('Skills desconocidas', { unknown });
  if (new Set(input.map((i) => i.skillId)).size !== input.length) throw new ValidationError('Skills duplicadas');

  const previous = new Map(candidate.skills.map((s) => [s.skillId, s]));
  const skills: CandidateSkillRecord[] = input.map((i) => {
    const s = taxonomy.get(i.skillId)!;
    const prev = previous.get(i.skillId);
    return { skillId: s.id, name: s.name, category: s.category, level: i.level, confirmed: true, source: prev?.source ?? 'declared', evidence: prev?.evidence ?? null };
  });

  const embedding = await deps.embedder.embed(profileText(candidate.headline, skills));
  await deps.candidates.save({ ...candidate, skills, embedding, updatedAt: deps.clock.now() });
  await deps.matchCache.invalidateCandidate(candidate.id);
  return { confirmedSkills: skills };
}

export async function getMyProfile(deps: Deps, userId: string) {
  const c = await requireCandidate(deps, userId);
  const { embedding: _e, resumeText: _r, ...profile } = c;
  return { ...profile, hasResume: Boolean(c.resumeText) };
}

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  headline: z.string().trim().max(160).nullish().transform((v) => v || null),
  seniority: z.enum(['junior', 'mid', 'senior', 'lead']).nullish().transform((v) => v ?? null),
  country: z.string().trim().length(2).toUpperCase().nullish().or(z.literal('')).transform((v) => v || null),
  preferredModalities: z.array(z.enum(['onsite', 'hybrid', 'remote'])).max(3).default([]),
  salaryExpectation: z.coerce.number().int().min(0).max(10_000_000).nullish().transform((v) => v || null),
});

/**
 * El candidato actualiza sus datos profesionales. Solo campos que usa el match (nunca atributos
 * protegidos). Recalcula el embedding e invalida la caché de match.
 */
export async function updateMyProfile(deps: Deps, userId: string, input: z.infer<typeof updateProfileSchema>) {
  const candidate = await requireCandidate(deps, userId);
  const confirmed = candidate.skills.filter((s) => s.confirmed);
  const embedding = confirmed.length ? await deps.embedder.embed(profileText(input.headline, confirmed)) : candidate.embedding;
  await deps.candidates.save({ ...candidate, ...input, preferredModalities: [...new Set(input.preferredModalities)], embedding, updatedAt: deps.clock.now() });
  await deps.matchCache.invalidateCandidate(candidate.id);
  return getMyProfile(deps, userId);
}
