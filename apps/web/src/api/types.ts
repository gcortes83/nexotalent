// Tipos del contrato del núcleo MVP (api/openapi.yaml). Mantener sincronizados.
export type Role = 'candidate' | 'recruiter' | 'employer_admin' | 'platform_admin';
export type ApplicationStatus =
  | 'submitted' | 'in_review' | 'shortlisted' | 'interview_scheduled' | 'interview_done'
  | 'offer' | 'hired' | 'rejected' | 'withdrawn';
export type RecruiterSettableStatus = Exclude<ApplicationStatus, 'submitted' | 'withdrawn'>;

export interface User { id: string; email: string; fullName: string; role: Role; organizationId: string | null }

export interface JobSkill { name: string; category: string; level: number; mustHave: boolean }
export interface Job {
  id: string; organizationName: string; title: string; description: string; status: string;
  seniority: string; modality: 'onsite' | 'hybrid' | 'remote'; country: string; city: string | null;
  salary: { min: number | null; max: number; currency: string } | null;
  positionsTotal: number; positionsAvailable: number; applicantsCount: number;
  skills: JobSkill[]; publishedAt: string | null; closedAt?: string | null;
  /** Contratación urgente («hot»). */
  urgent?: boolean;
}

export interface RadarPoint { axis: string; required: number; candidate: number }
export interface SkillGap { skill: string; required: number; candidate: number; mustHave: boolean }
export interface JobMatch {
  candidateId: string; jobId: string; score: number; scorePercent: number;
  factors: Record<'skillCoverage' | 'semanticSimilarity' | 'seniorityFit' | 'preferenceFit' | 'mustHavePenalty', number>;
  missingMustHaves: string[]; radar: RadarPoint[]; strengths: string[]; gaps: SkillGap[];
  explanation: string; modelVersion: string; computedAt: string;
}

export interface Skill { id: string; name: string; category: string; aliases: string[] }
export interface CandidateSkill {
  skillId: string; name: string; category: string; level: number; confirmed: boolean;
  source: 'declared' | 'extracted'; evidence: string | null;
}
export interface CandidateProfile {
  id: string; fullName: string; headline: string | null; seniority: string | null;
  skills: CandidateSkill[]; hasResume: boolean;
}

export interface Application {
  id: string; jobId: string; candidateId: string; status: ApplicationStatus; version: number;
  matchScore: number | null; createdAt: string; statusChangedAt: string;
}
export type StepState = 'done' | 'current' | 'upcoming';
export interface Stepper {
  steps: { key: ApplicationStatus; label: string; state: StepState; date: string | null }[];
  current: ApplicationStatus;
  terminal: 'rejected' | 'withdrawn' | 'hired' | null;
  terminalLabel: string | null;
}
export interface CandidateDashboard {
  candidate: { id: string; fullName: string; hasConfirmedSkills: boolean };
  summary: { total: number; active: number };
  applications: (Application & { job: { id: string; title: string; organizationName: string; status: string } | null; stepper: Stepper })[];
  recommendedJobs: (Job & { matchScore: number; scorePercent: number })[];
}

export interface EmployerDashboard {
  jobs: (Job & { pipeline: Record<string, number> })[];
  staleApplications: {
    applicationId: string; jobId: string; jobTitle: string | null; status: ApplicationStatus;
    version: number; staleDays: number; level: 'warning' | 'escalated';
  }[];
}
export interface JobApplicant extends Application {
  candidate: { id: string; fullName: string; headline: string | null; seniority: string | null } | null;
  staleDays: number;
}

export interface Problem {
  type: string; title: string; status: number; detail?: string; details?: unknown;
  errors?: { path: string; message: string }[];
}

// ── Change add-accounts-jobs-notifications ─────────────────────────────────────
export type AccountKind = 'candidate' | 'employer';
export type Modality = 'onsite' | 'hybrid' | 'remote';
export type Seniority = 'junior' | 'mid' | 'senior' | 'lead';
export interface AuthResponse { token: string; user: User }

export interface CandidateProfileFull extends CandidateProfile {
  country: string | null; preferredModalities: Modality[]; salaryExpectation: number | null;
}
export interface ProfileInput {
  fullName: string; headline: string | null; seniority: Seniority | null; country: string | null;
  preferredModalities: Modality[]; salaryExpectation: number | null;
}

export type JobStatus = 'draft' | 'pending_payment' | 'published' | 'on_hold' | 'filled' | 'cancelled' | 'expired' | 'closed';
export interface EmployerJob extends Omit<Job, 'skills' | 'status'> {
  status: JobStatus; closedAt: string | null; externalId: string | null; sourceType: 'manual' | 'seed' | 'csv' | 'json' | 'pdf';
  updatedAt: string; skills: (JobSkill & { skillId: string })[];
}
export interface JobInput {
  externalId?: string | null; title: string; description: string; seniority: Seniority; modality: Modality;
  country: string; city: string | null; salaryMin: number | null; salaryMax: number | null; currency: string;
  positionsTotal: number; skills: { name: string; level: number; mustHave: boolean }[]; urgent?: boolean;
  /** Soft skills opcionales (categoría «Soft skills»). */
  softSkills?: { name: string; level: number; mustHave: boolean }[];
}
export type ImportFormat = 'csv' | 'json' | 'pdf';
export interface ImportReport {
  format: ImportFormat; created: number; updated: number;
  items: { row: number; jobId: string; title: string; result: 'created' | 'updated'; status: string; warnings: string[] }[];
  errors: { row: number; message: string }[];
}

export type NotificationKind = 'selected' | 'status_changed' | 'job_closed';
export interface AppNotification {
  id: string; userId: string; kind: NotificationKind; title: string; body: string;
  data: { jobId?: string; applicationId?: string; status?: string; jobTitle?: string; organizationName?: string };
  readAt: string | null; createdAt: string;
}

// ── Búsqueda de vacantes (GET /v1/jobs) ────────────────────────────────────
export type JobSort = 'recent' | 'salary_desc' | 'salary_asc' | 'positions';
export interface JobSearchParams {
  q?: string; modality?: Modality[]; seniority?: Seniority[]; country?: string[]; skills?: string[];
  minSalary?: number; urgent?: boolean; sort?: JobSort; page?: number; pageSize?: number;
}
export interface JobFacets {
  modality: Partial<Record<Modality, number>>; seniority: Partial<Record<Seniority, number>>;
  country: Record<string, number>; skills: { name: string; count: number }[];
  salary: { min: number | null; max: number | null };
  urgent?: number;
}
export interface JobSearchResult { items: Job[]; total: number; page: number; pageSize: number; facets: JobFacets }
