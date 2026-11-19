import type {
  CandidateSkill,
  MatchCandidate,
  MatchFactors,
  MatchJob,
  MatchResult,
  RadarPoint,
  RequiredSkill,
  Seniority,
  SkillGap,
} from './types.js';

/**
 * Fórmula de matching híbrido (docs/03-arquitectura-ai.md §3, spec openspec/specs/matching).
 * Función pura: sin I/O, sin reloj, sin aleatoriedad. Cualquier cambio de pesos o reglas
 * DEBE subir MATCH_MODEL_VERSION (invalida cachés y ETags).
 */
export const MATCH_MODEL_VERSION = 'match-v1';

export const MATCH_WEIGHTS = {
  skillCoverage: 0.45,
  semanticSimilarity: 0.3,
  seniorityFit: 0.15,
  preferenceFit: 0.1,
} as const;

export const MUST_HAVE_PENALTY = 0.1;
export const MUST_HAVE_PENALTY_CAP = 0.3;
export const MAX_RADAR_AXES = 8;
export const OTHER_AXIS = 'Otros';

const SENIORITY_RANK: Record<Seniority, number> = { junior: 1, mid: 2, senior: 3, lead: 4 };

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const round = (n: number, decimals: number): number => {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
};

export function computeMatch(
  candidate: MatchCandidate,
  job: MatchJob,
  semanticSimilarity: number,
): MatchResult {
  // Solo se leen campos profesionales explícitos: los atributos protegidos que pudieran
  // venir en el objeto nunca se consultan.
  const confirmed = indexConfirmedSkills(candidate.skills);
  const levelOf = (s: RequiredSkill): number => Math.min(confirmed.get(s.skillId)?.level ?? 0, 5);

  const radar = buildRadar(job.skills, levelOf);
  const { strengths, gaps } = splitStrengthsAndGaps(job.skills, levelOf);
  const missingMustHaves = job.skills.filter((s) => s.mustHave && !confirmed.has(s.skillId)).map((s) => s.name);

  const base = { candidateId: candidate.id, jobId: job.id, modelVersion: MATCH_MODEL_VERSION, radar, gaps };

  if (confirmed.size === 0) {
    return {
      ...base,
      score: 0,
      scorePercent: 0,
      factors: { skillCoverage: 0, semanticSimilarity: 0, seniorityFit: 0, preferenceFit: 0, mustHavePenalty: 0 },
      missingMustHaves,
      strengths: [],
      explanation: 'Aún no tienes skills confirmadas. Confirma tus skills para calcular tu match.',
    };
  }

  const factors: MatchFactors = {
    skillCoverage: round(skillCoverage(job.skills, levelOf), 4),
    semanticSimilarity: round(clamp01(semanticSimilarity), 4),
    seniorityFit: seniorityFit(candidate.seniority, job.seniority),
    preferenceFit: round(preferenceFit(candidate, job), 4),
    mustHavePenalty: round(Math.min(missingMustHaves.length * MUST_HAVE_PENALTY, MUST_HAVE_PENALTY_CAP), 4),
  };

  const raw =
    MATCH_WEIGHTS.skillCoverage * factors.skillCoverage +
    MATCH_WEIGHTS.semanticSimilarity * factors.semanticSimilarity +
    MATCH_WEIGHTS.seniorityFit * factors.seniorityFit +
    MATCH_WEIGHTS.preferenceFit * factors.preferenceFit -
    factors.mustHavePenalty;
  const score = round(clamp01(raw), 4);

  return {
    ...base,
    score,
    scorePercent: Math.round(score * 100),
    factors,
    missingMustHaves,
    strengths,
    explanation: explain(job.skills.length, strengths, gaps, missingMustHaves),
  };
}

function indexConfirmedSkills(skills: CandidateSkill[]): Map<string, CandidateSkill> {
  const map = new Map<string, CandidateSkill>();
  for (const s of skills) if (s.confirmed && s.level > 0) map.set(s.skillId, s);
  return map;
}

/** Σ w·min(level_c / level_j, 1) / Σ w */
function skillCoverage(required: RequiredSkill[], levelOf: (s: RequiredSkill) => number): number {
  const totalWeight = required.reduce((acc, s) => acc + s.weight, 0);
  if (totalWeight === 0) return 0;
  const covered = required.reduce((acc, s) => acc + s.weight * Math.min(levelOf(s) / Math.max(s.level, 1), 1), 0);
  return covered / totalWeight;
}

/** Igual o superior → 1; cada nivel por debajo resta 0.5; desconocido → 0.5. */
function seniorityFit(candidate: Seniority | null | undefined, job: Seniority): number {
  if (!candidate) return 0.5;
  const diff = SENIORITY_RANK[candidate] - SENIORITY_RANK[job];
  return diff >= 0 ? 1 : clamp01(1 + 0.5 * diff);
}

/** Promedio de modalidad, ubicación y salario (cada uno 0..1). Dato faltante → neutral (1). */
function preferenceFit(candidate: MatchCandidate, job: MatchJob): number {
  const modality =
    candidate.preferredModalities.length === 0 || candidate.preferredModalities.includes(job.modality) ? 1 : 0;
  const location = job.modality === 'remote' || !candidate.country || candidate.country === job.country ? 1 : 0;
  const salary =
    job.salaryMax == null || candidate.salaryExpectation == null || candidate.salaryExpectation <= 0
      ? 1
      : clamp01(job.salaryMax / candidate.salaryExpectation);
  return (modality + location + salary) / 3;
}

function buildRadar(required: RequiredSkill[], levelOf: (s: RequiredSkill) => number): RadarPoint[] {
  const groups = new Map<string, RequiredSkill[]>();
  for (const s of required) groups.set(s.category, [...(groups.get(s.category) ?? []), s]);

  const totalWeight = (skills: RequiredSkill[]) => skills.reduce((acc, s) => acc + s.weight, 0);
  // Orden estable: más peso primero; empate → orden de aparición.
  let axes = [...groups.entries()].sort((a, b) => totalWeight(b[1]) - totalWeight(a[1]));

  if (axes.length > MAX_RADAR_AXES) {
    const kept = axes.slice(0, MAX_RADAR_AXES - 1);
    const rest = axes.slice(MAX_RADAR_AXES - 1).flatMap(([, skills]) => skills);
    axes = [...kept, [OTHER_AXIS, rest]];
  }

  return axes.map(([axis, skills]) => {
    const w = totalWeight(skills) || 1;
    return {
      axis,
      required: round(skills.reduce((acc, s) => acc + s.weight * s.level, 0) / w, 1),
      candidate: round(skills.reduce((acc, s) => acc + s.weight * levelOf(s), 0) / w, 1),
    };
  });
}

function splitStrengthsAndGaps(
  required: RequiredSkill[],
  levelOf: (s: RequiredSkill) => number,
): { strengths: string[]; gaps: SkillGap[] } {
  const strengths: string[] = [];
  const gapSkills: RequiredSkill[] = [];
  for (const s of required) (levelOf(s) >= s.level ? strengths.push(s.name) : gapSkills.push(s));

  const gaps = gapSkills
    .map((s, index) => ({ s, index }))
    .sort((a, b) => Number(b.s.mustHave) - Number(a.s.mustHave) || b.s.weight - a.s.weight || a.index - b.index)
    .map(({ s }) => ({ skill: s.name, required: s.level, candidate: levelOf(s), mustHave: s.mustHave }));

  return { strengths, gaps };
}

function explain(total: number, strengths: string[], gaps: SkillGap[], missingMustHaves: string[]): string {
  const parts = [`Cumples ${strengths.length} de ${total} skills requeridas.`];
  if (strengths.length) parts.push(`Fortalezas: ${strengths.join(', ')}.`);
  if (gaps.length) {
    parts.push(`Brechas: ${gaps.map((g) => `${g.skill} (requiere ${g.required}, tienes ${g.candidate})`).join(', ')}.`);
  }
  if (missingMustHaves.length === 1) parts.push(`Falta skill obligatoria: ${missingMustHaves[0]}.`);
  if (missingMustHaves.length > 1) parts.push(`Faltan skills obligatorias: ${missingMustHaves.join(', ')}.`);
  return parts.join(' ');
}
