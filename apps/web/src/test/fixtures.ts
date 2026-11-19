import type { CandidateDashboard, Job, JobMatch, Stepper, User } from '../api/types';

export const ana: User = { id: 'usr_ana', email: 'candidata@example.com', fullName: 'Ana Ejemplo', role: 'candidate', organizationId: null };
export const ruben: User = { id: 'usr_rec', email: 'reclutador@example.com', fullName: 'Rubén Reclutador', role: 'recruiter', organizationId: 'org_fintech' };

export const job: Job = {
  id: 'job_backend_node', organizationName: 'Fintech Ejemplo S.A.', title: 'Backend Engineer Node.js',
  description: 'Vacante sintética.', status: 'published', seniority: 'senior', modality: 'remote', country: 'MX', city: null,
  salary: { min: 4100, max: 5500, currency: 'USD' }, positionsTotal: 2, positionsAvailable: 2, applicantsCount: 0,
  skills: [{ name: 'TypeScript', category: 'Lenguajes', level: 4, mustHave: true }, { name: 'AWS', category: 'Cloud', level: 3, mustHave: false }],
  publishedAt: '2026-11-07T12:00:00.000Z',
};

export const match: JobMatch = {
  candidateId: 'cand_ana', jobId: 'job_backend_node', score: 0.82, scorePercent: 82,
  factors: { skillCoverage: 0.9, semanticSimilarity: 0.7, seniorityFit: 1, preferenceFit: 1, mustHavePenalty: 0 },
  missingMustHaves: [], radar: [{ axis: 'Lenguajes', required: 4, candidate: 5 }, { axis: 'Cloud', required: 3, candidate: 2 }],
  strengths: ['TypeScript'], gaps: [{ skill: 'AWS', required: 3, candidate: 2, mustHave: false }],
  explanation: 'Cumples 1 de 2 skills requeridas.', modelVersion: 'match-v1', computedAt: '2026-11-17T12:00:00.000Z',
};

export const stepper = (current: Stepper['current'], terminal: Stepper['terminal'] = null): Stepper => {
  const keys = ['submitted', 'in_review', 'shortlisted', 'interview_scheduled', 'interview_done', 'offer', 'hired'] as const;
  const labels = ['Postulado', 'En revisión', 'Preseleccionado', 'Entrevista agendada', 'Entrevista realizada', 'Oferta', 'Contratado'];
  const idx = keys.indexOf(current as (typeof keys)[number]);
  return {
    steps: keys.map((key, i) => ({ key, label: labels[i]!, state: i < idx ? 'done' : i === idx ? 'current' : 'upcoming', date: i <= idx ? '2026-11-10T12:00:00.000Z' : null })),
    current, terminal,
    terminalLabel: terminal === 'rejected' ? 'No seleccionado' : terminal === 'withdrawn' ? 'Retirado por ti' : terminal === 'hired' ? 'Contratado' : null,
  };
};

export const dashboard = (overrides: Partial<CandidateDashboard> = {}): CandidateDashboard => ({
  candidate: { id: 'cand_ana', fullName: 'Ana Ejemplo', hasConfirmedSkills: true },
  summary: { total: 1, active: 1 },
  applications: [{
    id: 'app_1', jobId: 'job_frontend_react', candidateId: 'cand_ana', status: 'shortlisted', version: 3, matchScore: 0.62,
    createdAt: '2026-11-10T12:00:00.000Z', statusChangedAt: '2026-11-16T12:00:00.000Z',
    job: { id: 'job_frontend_react', title: 'Frontend Engineer React', organizationName: 'Fintech Ejemplo S.A.', status: 'published' },
    stepper: stepper('shortlisted'),
  }],
  recommendedJobs: [],
  ...overrides,
});
