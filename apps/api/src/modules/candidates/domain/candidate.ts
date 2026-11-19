import type { CandidateSkill, MatchCandidate, Modality, Seniority } from '../../matching/domain/types.js';

export type SkillSource = 'declared' | 'extracted';

export interface CandidateSkillRecord extends CandidateSkill {
  source: SkillSource;
  evidence: string | null;
}

/**
 * Perfil del candidato. Por diseño NO almacena atributos protegidos
 * (género, edad, estado civil, foto, nacionalidad, dirección exacta).
 */
export interface Candidate {
  id: string;
  userId: string;
  fullName: string;
  headline: string | null;
  seniority: Seniority | null;
  country: string | null;
  preferredModalities: Modality[];
  salaryExpectation: number | null;
  resumeText: string | null;
  skills: CandidateSkillRecord[];
  embedding: number[] | null;
  updatedAt: Date;
}

/** Proyección mínima para el match: solo campos profesionales. */
export const toMatchCandidate = (c: Candidate): MatchCandidate => ({
  id: c.id,
  seniority: c.seniority,
  country: c.country,
  preferredModalities: c.preferredModalities,
  salaryExpectation: c.salaryExpectation,
  skills: c.skills.map(({ skillId, name, category, level, confirmed }) => ({ skillId, name, category, level, confirmed })),
});
