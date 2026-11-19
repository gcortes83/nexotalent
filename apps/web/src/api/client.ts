import type {
  AccountKind, AppNotification, Application, AuthResponse, CandidateDashboard, CandidateProfileFull, CandidateSkill,
  EmployerDashboard, EmployerJob, ImportFormat, ImportReport, Job, JobApplicant, JobInput, JobMatch, JobSearchParams,
  JobSearchResult, Problem,
  ProfileInput, RecruiterSettableStatus, Skill, User,
} from './types';
import { currentDict } from '../i18n';

const TOKEN_KEY = 'nexo.token';
const BASE = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(readonly status: number, readonly problem: Problem | null) {
    super(problem?.title ?? `Error ${status}`);
  }
}

export const tokenStore = {
  get: (): string | null => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t: string | null) => {
    try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage bloqueado */ }
  },
};

export async function request<T>(path: string, init: RequestInit = {}): Promise<{ data: T; etag: string | null }> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (typeof init.body === 'string' && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  headers.set('X-Correlation-Id', crypto.randomUUID());
  const token = tokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let problem: Problem | null = null;
    try { problem = (await res.json()) as Problem; } catch { /* sin cuerpo */ }
    if (res.status === 401) tokenStore.set(null);
    throw new ApiError(res.status, problem);
  }
  const data = res.status === 204 || res.status === 304 ? (undefined as T) : ((await res.json()) as T);
  return { data, etag: res.headers.get('ETag') };
}

const get = async <T>(path: string) => (await request<T>(path)).data;
const send = async <T>(method: string, path: string, body?: unknown, headers?: HeadersInit) =>
  (await request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body), headers })).data;

export const api = {
  demoLogin: (email: string) => send<{ token: string; user: User }>('POST', '/v1/auth/demo-login', { email }),
  me: () => get<User>('/v1/me'),
  skills: () => get<Skill[]>('/v1/skills'),
  jobs: (q?: string) => get<{ items: Job[] }>(`/v1/jobs${q ? `?q=${encodeURIComponent(q)}` : ''}`).then((r) => r.items),
  searchJobs: (params: JobSearchParams) => get<JobSearchResult>(`/v1/jobs${jobSearchQuery(params)}`),
  job: (id: string) => get<Job>(`/v1/jobs/${encodeURIComponent(id)}`),
  match: (jobId: string) => get<JobMatch>(`/v1/jobs/${encodeURIComponent(jobId)}/match`),
  apply: (jobId: string) => send<Application>('POST', `/v1/jobs/${encodeURIComponent(jobId)}/applications`),
  myProfile: () => get<CandidateProfileFull>('/v1/candidates/me'),
  submitResume: (text: string) =>
    send<{ proposedSkills: CandidateSkill[]; confirmedSkills: CandidateSkill[] }>('POST', '/v1/candidates/me/resume', { text }),
  confirmSkills: (skills: { skillId: string; level: number }[]) =>
    send<{ confirmedSkills: CandidateSkill[] }>('PUT', '/v1/candidates/me/skills', { skills }),
  candidateDashboard: () => get<CandidateDashboard>('/v1/bff/candidate/dashboard'),
  withdraw: (applicationId: string) => send<Application>('POST', `/v1/applications/${encodeURIComponent(applicationId)}/withdraw`),
  employerDashboard: () => get<EmployerDashboard>('/v1/bff/employer/dashboard'),
  jobApplicants: (jobId: string) =>
    get<{ items: JobApplicant[] }>(`/v1/jobs/${encodeURIComponent(jobId)}/applications`).then((r) => r.items),
  changeStatus: (applicationId: string, status: RecruiterSettableStatus, version: number, reason?: string) =>
    send<Application>('PATCH', `/v1/applications/${encodeURIComponent(applicationId)}/status`, { status, reason }, { 'If-Match': `"${version}"` }),

  // Cuentas
  login: (email: string, password: string, kind: AccountKind) => send<AuthResponse>('POST', '/v1/auth/login', { email, password, kind }),
  registerCandidate: (body: { fullName: string; email: string; password: string; headline?: string | null; country?: string | null; acceptPrivacy: boolean }) =>
    send<AuthResponse>('POST', '/v1/auth/register/candidate', body),
  registerEmployer: (body: { companyName: string; fullName: string; email: string; password: string; acceptPrivacy: boolean }) =>
    send<AuthResponse>('POST', '/v1/auth/register/employer', body),

  // Perfil del candidato
  updateProfile: (body: ProfileInput) => send<CandidateProfileFull>('PUT', '/v1/candidates/me', body),
  uploadResumeFile: (file: File) =>
    request<{ proposedSkills: CandidateSkill[]; confirmedSkills: CandidateSkill[] }>('/v1/candidates/me/resume/file', {
      method: 'POST', body: file, headers: { 'Content-Type': fileType(file) },
    }).then((r) => r.data),

  // Vacantes del empleador
  employerJobs: () => get<{ items: EmployerJob[] }>('/v1/employer/jobs').then((r) => r.items),
  employerJob: (id: string) => get<EmployerJob>(`/v1/employer/jobs/${encodeURIComponent(id)}`),
  createJob: (body: JobInput, publish: boolean) => send<EmployerJob>('POST', '/v1/employer/jobs', { ...body, publish }),
  updateJob: (id: string, body: JobInput) => send<EmployerJob>('PUT', `/v1/employer/jobs/${encodeURIComponent(id)}`, body),
  publishJob: (id: string) => send<EmployerJob>('POST', `/v1/employer/jobs/${encodeURIComponent(id)}/publish`),
  closeJob: (id: string) => send<EmployerJob & { notifiedCandidates: number }>('POST', `/v1/employer/jobs/${encodeURIComponent(id)}/close`),
  importJobs: (format: ImportFormat, file: File, publish: boolean) =>
    request<ImportReport>(`/v1/employer/jobs/imports?format=${format}&publish=${publish}`, {
      method: 'POST', body: file, headers: { 'Content-Type': fileType(file, format) },
    }).then((r) => r.data),

  // Notificaciones
  notifications: (unread = false) => get<{ items: AppNotification[]; unreadCount: number }>(`/v1/notifications${unread ? '?unread=true' : ''}`),
  markNotificationRead: (id: string) => send<void>('POST', `/v1/notifications/${encodeURIComponent(id)}/read`),
};

/** Query de búsqueda: omite vacíos; las listas viajan como CSV (?modality=remote,hybrid). */
export function jobSearchQuery(p: JobSearchParams): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    qs.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

/** Content-Type del archivo a subir (el navegador no siempre lo informa para .md/.csv). */
export function fileType(file: File, format?: ImportFormat): string {
  const name = file.name.toLowerCase();
  if (format === 'json' || name.endsWith('.json')) return 'application/json';
  if (format === 'pdf' || name.endsWith('.pdf')) return 'application/pdf';
  if (format === 'csv' || name.endsWith('.csv')) return 'text/csv';
  if (name.endsWith('.md')) return 'text/markdown';
  return 'text/plain';
}

/** Mensaje de error en el idioma activo: por código de Problem Details; si no hay traducción, el título de la API. */
export function problemMessage(e: unknown): string {
  const t = currentDict();
  if (e instanceof ApiError) {
    if (e.status === 412) return t.errors.staleVersion;
    const code = e.problem?.type?.split('/').pop() ?? '';
    const first = e.problem?.errors?.[0];
    if (first) return t.errors.byCode.validation ? t.errors.invalidField(first.path || first.message) : first.message;
    return t.errors.byCode[code] ?? e.problem?.title ?? e.message;
  }
  return t.common.networkError;
}
