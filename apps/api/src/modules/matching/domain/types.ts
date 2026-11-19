export const SENIORITIES = ['junior', 'mid', 'senior', 'lead'] as const;
export type Seniority = (typeof SENIORITIES)[number];

export const MODALITIES = ['onsite', 'hybrid', 'remote'] as const;
export type Modality = (typeof MODALITIES)[number];

export interface SkillRef {
  skillId: string;
  name: string;
  /** Categoría de la taxonomía = eje del radar (Lenguajes, Frameworks, Cloud, Datos…). */
  category: string;
}

export interface RequiredSkill extends SkillRef {
  /** Nivel requerido 1..5 */
  level: number;
  /** Peso relativo > 0 */
  weight: number;
  mustHave: boolean;
}

export interface CandidateSkill extends SkillRef {
  /** Nivel del candidato 0..5 */
  level: number;
  /** Solo las skills confirmadas por el candidato cuentan para el match. */
  confirmed: boolean;
}

/**
 * Entrada del match para la vacante. Solo contiene atributos profesionales.
 */
export interface MatchJob {
  id: string;
  seniority: Seniority;
  modality: Modality;
  country: string;
  salaryMax?: number | null;
  skills: RequiredSkill[];
}

/**
 * Entrada del match para el candidato. NO incluye atributos protegidos
 * (género, edad, estado civil, foto, nacionalidad, dirección exacta).
 */
export interface MatchCandidate {
  id: string;
  seniority?: Seniority | null;
  country?: string | null;
  preferredModalities: Modality[];
  salaryExpectation?: number | null;
  skills: CandidateSkill[];
}

export interface MatchFactors {
  skillCoverage: number;
  semanticSimilarity: number;
  seniorityFit: number;
  preferenceFit: number;
  mustHavePenalty: number;
}

export interface RadarPoint {
  axis: string;
  required: number;
  candidate: number;
}

export interface SkillGap {
  skill: string;
  required: number;
  candidate: number;
  mustHave: boolean;
}

export interface MatchResult {
  candidateId: string;
  jobId: string;
  /** 0..1, 4 decimales */
  score: number;
  /** 0..100 entero, para UI */
  scorePercent: number;
  factors: MatchFactors;
  missingMustHaves: string[];
  radar: RadarPoint[];
  strengths: string[];
  gaps: SkillGap[];
  explanation: string;
  modelVersion: string;
}
