import type {
  CandidateSkill,
  MatchCandidate,
  MatchJob,
  RequiredSkill,
} from '../../src/modules/matching/domain/types.js';

/** Factories con datos 100 % sintéticos. */
export const req = (
  name: string,
  category: string,
  level: number,
  opts: Partial<Pick<RequiredSkill, 'weight' | 'mustHave'>> = {},
): RequiredSkill => ({
  skillId: `sk_${name.toLowerCase()}`,
  name,
  category,
  level,
  weight: opts.weight ?? 1,
  mustHave: opts.mustHave ?? false,
});

export const has = (
  name: string,
  category: string,
  level: number,
  confirmed = true,
): CandidateSkill => ({
  skillId: `sk_${name.toLowerCase()}`,
  name,
  category,
  level,
  confirmed,
});

export const aJob = (overrides: Partial<MatchJob> = {}): MatchJob => ({
  id: 'job_1',
  seniority: 'senior',
  modality: 'remote',
  country: 'MX',
  salaryMax: 80000,
  skills: [
    req('TypeScript', 'Lenguajes', 4, { weight: 2, mustHave: true }),
    req('Node.js', 'Frameworks', 4, { weight: 2, mustHave: true }),
    req('PostgreSQL', 'Datos', 3),
    req('AWS', 'Cloud', 3),
  ],
  ...overrides,
});

export const aCandidate = (overrides: Partial<MatchCandidate> = {}): MatchCandidate => ({
  id: 'cand_1',
  seniority: 'senior',
  country: 'MX',
  preferredModalities: ['remote', 'hybrid'],
  salaryExpectation: 70000,
  skills: [
    has('TypeScript', 'Lenguajes', 4),
    has('Node.js', 'Frameworks', 5),
    has('PostgreSQL', 'Datos', 3),
    has('AWS', 'Cloud', 3),
  ],
  ...overrides,
});
