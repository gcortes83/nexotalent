import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import Fastify, { type FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  applyToJob,
  candidateDashboard,
  changeApplicationStatus,
  employerDashboard,
  listJobApplications,
  withdrawApplication,
} from '../../modules/applications/application/applications.js';
import { RECRUITER_SETTABLE_STATUSES } from '../../modules/applications/domain/status.js';
import {
  confirmSkills,
  getMyProfile,
  MAX_RESUME_CHARS,
  submitResume,
  updateMyProfile,
  updateProfileSchema,
} from '../../modules/candidates/application/resume.js';
import {
  loginSchema,
  loginWithPassword,
  registerCandidate,
  registerCandidateSchema,
  registerEmployer,
  registerEmployerSchema,
} from '../../modules/identity/application/accounts.js';
import type { User } from '../../modules/identity/domain/user.js';
import { importJobs } from '../../modules/jobs/application/import-jobs.js';
import {
  closeJob,
  createJob,
  getEmployerJob,
  jobInputSchema,
  listEmployerJobs,
  publishJob,
  updateJob,
} from '../../modules/jobs/application/manage-jobs.js';
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../modules/notifications/application/notifications.js';
import type { OutboxEmail } from '../email/email-senders.js';
import { documentText, MAX_UPLOAD_BYTES, PDF_TYPE } from '../files/document-text.js';
import { getPublishedJob, searchPublishedJobs } from '../../modules/jobs/application/jobs.js';
import { JOB_SORTS, MAX_PAGE_SIZE } from '../../modules/jobs/domain/job-search.js';
import { getJobMatch } from '../../modules/matching/application/get-job-match.js';
import type { Deps } from '../../ports.js';
import { DomainError, NotFoundError, ValidationError } from '../../shared/errors.js';
import { makeAuth } from './auth.js';
import { problemHandler } from './problem.js';

export interface AppConfig {
  jwtSecret: string;
  demoAuth: boolean;
  corsOrigins: string[];
  logger?: boolean;
  /** Correos simulados (EMAIL_PROVIDER=log), expuestos en GET /v1/dev/emails si demoAuth. */
  outbox?: () => OutboxEmail[];
}

const idParam = z.object({ id: z.string().min(1).max(64) });
const jobParam = z.object({ jobId: z.string().min(1).max(64) });

class PreconditionRequiredError extends DomainError {
  constructor() {
    super(428, 'precondition-required', 'Se requiere el header If-Match con la versión de la postulación');
  }
}

/** If-Match: "3" | W/"3" | 3 → 3 */
const parseVersion = (h: string | undefined): number | null => {
  const m = h?.match(/^(?:W\/)?"?(\d+)"?$/);
  return m ? Number(m[1]) : null;
};

export async function buildApp(deps: Deps, config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.logger
      ? { redact: ['req.headers.authorization', '*.email', '*.resumeText', '*.text'] }
      : false,
    genReqId: (req) => (req.headers['x-correlation-id'] as string | undefined) ?? crypto.randomUUID(),
  });
  await app.register(cors, { origin: config.corsOrigins, exposedHeaders: ['ETag', 'X-Correlation-Id'] });
  await app.register(jwt, { secret: config.jwtSecret, sign: { expiresIn: '8h' } });
  app.setErrorHandler(problemHandler);
  app.addHook('onSend', async (req, reply) => {
    reply.header('X-Correlation-Id', req.id);
  });
  const requireUser = makeAuth(app, deps);
  const issueToken = (user: User) => app.jwt.sign({ sub: user.id, role: user.role, org: user.organizationId });

  // Archivos (CV y vacantes) como cuerpo binario: PDF, texto, Markdown y CSV (máx. 5 MB).
  app.addContentTypeParser(
    [PDF_TYPE, 'text/plain', 'text/markdown', 'text/csv', 'application/octet-stream'],
    { parseAs: 'buffer', bodyLimit: MAX_UPLOAD_BYTES },
    (_req, body, done) => done(null, body),
  );
  const fileBody = (req: { body: unknown; headers: Record<string, unknown> }) => {
    if (!Buffer.isBuffer(req.body)) throw new ValidationError('Envía el archivo como cuerpo (application/pdf, text/plain o text/csv)');
    return documentText(req.body, String(req.headers['content-type'] ?? ''));
  };

  app.get('/health', async () => ({ status: 'ok' }));

  // ── Auth de demo (simula Cognito; deshabilitado si DEMO_AUTH=false) ────────────────
  app.post('/v1/auth/demo-login', async (req) => {
    if (!config.demoAuth) throw new NotFoundError('Ruta');
    const { email } = z.object({ email: z.email() }).parse(req.body);
    const user = await deps.users.getByEmail(email);
    if (!user) throw new NotFoundError('Usuario de demo');
    return { token: issueToken(user), user };
  });

  app.get('/v1/me', async (req) => requireUser(req));
  app.get('/v1/skills', async () => deps.skills.list());

  // ── Vacantes (lectura pública) ───────────────────────────────────────────────────
  // Listas en query como CSV: ?modality=remote,hybrid&skills=React,TypeScript
  const csvList = <T extends z.ZodType>(item: T) =>
    z.preprocess((v) => (typeof v === 'string' ? v.split(',').map((x) => x.trim()).filter(Boolean) : v), z.array(item).max(20).optional());
  const jobSearchQuery = z.object({
    q: z.string().max(100).optional(),
    modality: csvList(z.enum(['onsite', 'hybrid', 'remote'])),
    seniority: csvList(z.enum(['junior', 'mid', 'senior', 'lead'])),
    country: csvList(z.string().length(2).toUpperCase()),
    skills: csvList(z.string().min(1).max(60)),
    minSalary: z.coerce.number().int().min(0).max(10_000_000).optional(),
    urgent: z.enum(['true', 'false']).optional().transform((v) => (v === undefined ? undefined : v === 'true')),
    sort: z.enum(JOB_SORTS).optional(),
    page: z.coerce.number().int().min(1).max(1000).optional(),
    pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
  });
  app.get('/v1/jobs', async (req) => searchPublishedJobs(deps, jobSearchQuery.parse(req.query)));
  app.get('/v1/jobs/:jobId', async (req) => getPublishedJob(deps, jobParam.parse(req.params).jobId));

  // ── Candidato ────────────────────────────────────────────────────────────────────
  app.get('/v1/jobs/:jobId/match', async (req, reply) => {
    const user = await requireUser(req, 'candidate');
    const view = await getJobMatch(deps, user.id, jobParam.parse(req.params).jobId);
    reply.header('ETag', view.etag).header('Cache-Control', 'private, no-cache');
    if (req.headers['if-none-match'] === view.etag) return reply.status(304).send();
    return { ...view.result, computedAt: view.computedAt.toISOString() };
  });

  app.post('/v1/jobs/:jobId/applications', async (req, reply) => {
    const user = await requireUser(req, 'candidate');
    const created = await applyToJob(deps, user.id, jobParam.parse(req.params).jobId);
    return reply.status(201).header('ETag', `"${created.version}"`).send(created);
  });

  app.get('/v1/candidates/me', async (req) => getMyProfile(deps, (await requireUser(req, 'candidate')).id));

  app.post('/v1/candidates/me/resume', async (req) => {
    const user = await requireUser(req, 'candidate');
    const { text } = z.object({ text: z.string().max(MAX_RESUME_CHARS) }).parse(req.body);
    return submitResume(deps, user.id, text);
  });

  app.put('/v1/candidates/me/skills', async (req) => {
    const user = await requireUser(req, 'candidate');
    const { skills } = z
      .object({ skills: z.array(z.object({ skillId: z.string().min(1), level: z.number().int().min(1).max(5) })).max(60) })
      .parse(req.body);
    return confirmSkills(deps, user.id, skills);
  });

  app.get('/v1/bff/candidate/dashboard', async (req) => candidateDashboard(deps, (await requireUser(req, 'candidate')).id));

  app.post('/v1/applications/:id/withdraw', async (req) => {
    const user = await requireUser(req, 'candidate');
    return withdrawApplication(deps, user.id, idParam.parse(req.params).id);
  });

  // ── Empleador ────────────────────────────────────────────────────────────────────
  app.get('/v1/bff/employer/dashboard', async (req) =>
    employerDashboard(deps, await requireUser(req, 'recruiter', 'employer_admin')),
  );

  app.get('/v1/jobs/:jobId/applications', async (req) => {
    const user = await requireUser(req, 'recruiter', 'employer_admin');
    return { items: await listJobApplications(deps, user, jobParam.parse(req.params).jobId) };
  });

  app.patch('/v1/applications/:id/status', async (req, reply) => {
    const user = await requireUser(req, 'recruiter', 'employer_admin');
    const expectedVersion = parseVersion(req.headers['if-match']);
    if (expectedVersion === null) throw new PreconditionRequiredError();
    const body = z
      .object({ status: z.enum(RECRUITER_SETTABLE_STATUSES), reason: z.string().max(500).nullish() })
      .parse(req.body);
    const updated = await changeApplicationStatus(deps, user, {
      applicationId: idParam.parse(req.params).id,
      to: body.status,
      expectedVersion,
      reason: body.reason ?? null,
    });
    return reply.header('ETag', `"${updated.version}"`).send(updated);
  });

  // ── Cuentas: registro y login con contraseña (change add-accounts-jobs-notifications) ──
  app.post('/v1/auth/register/candidate', async (req, reply) => {
    const user = await registerCandidate(deps, registerCandidateSchema.parse(req.body));
    return reply.status(201).send({ token: issueToken(user), user });
  });
  app.post('/v1/auth/register/employer', async (req, reply) => {
    const user = await registerEmployer(deps, registerEmployerSchema.parse(req.body));
    return reply.status(201).send({ token: issueToken(user), user });
  });
  app.post('/v1/auth/login', async (req) => {
    const user = await loginWithPassword(deps, loginSchema.parse(req.body));
    return { token: issueToken(user), user };
  });

  // ── Perfil del candidato ─────────────────────────────────────────────────────────
  app.put('/v1/candidates/me', async (req) => {
    const user = await requireUser(req, 'candidate');
    return updateMyProfile(deps, user.id, updateProfileSchema.parse(req.body));
  });
  app.post('/v1/candidates/me/resume/file', async (req) => {
    const user = await requireUser(req, 'candidate');
    const text = (await fileBody(req)).slice(0, MAX_RESUME_CHARS);
    return submitResume(deps, user.id, text);
  });

  // ── Gestión de vacantes del empleador ───────────────────────────────────────────
  const employer = (req: Parameters<typeof requireUser>[0]) => requireUser(req, 'recruiter', 'employer_admin');
  const publishFlag = z.object({ publish: z.coerce.boolean().optional().default(false) });

  app.get('/v1/employer/jobs', async (req) => ({ items: await listEmployerJobs(deps, await employer(req)) }));
  app.post('/v1/employer/jobs', async (req, reply) => {
    const user = await employer(req);
    const { publish } = publishFlag.parse(req.body ?? {});
    return reply.status(201).send(await createJob(deps, user, jobInputSchema.parse(req.body), publish));
  });
  app.get('/v1/employer/jobs/:jobId', async (req) => getEmployerJob(deps, await employer(req), jobParam.parse(req.params).jobId));
  app.put('/v1/employer/jobs/:jobId', async (req) =>
    updateJob(deps, await employer(req), jobParam.parse(req.params).jobId, jobInputSchema.parse(req.body)),
  );
  app.post('/v1/employer/jobs/:jobId/publish', async (req) => publishJob(deps, await employer(req), jobParam.parse(req.params).jobId));
  app.post('/v1/employer/jobs/:jobId/close', async (req) => closeJob(deps, await employer(req), jobParam.parse(req.params).jobId));

  app.post('/v1/employer/jobs/imports', { bodyLimit: MAX_UPLOAD_BYTES }, async (req) => {
    const user = await employer(req);
    const q = z
      .object({ format: z.enum(['csv', 'json', 'pdf']), publish: z.enum(['true', 'false']).default('false') })
      .parse(req.query);
    const content = q.format === 'json'
      ? (Buffer.isBuffer(req.body) ? JSON.parse((req.body as Buffer).toString('utf8')) : req.body)
      : await fileBody(req);
    return importJobs(deps, user, { format: q.format, content, publish: q.publish === 'true' });
  });

  // ── Notificaciones in-app ────────────────────────────────────────────────────────
  app.get('/v1/notifications', async (req) => {
    const user = await requireUser(req);
    const { unread } = z.object({ unread: z.enum(['true', 'false']).optional() }).parse(req.query);
    return listMyNotifications(deps, user.id, unread === 'true');
  });
  app.post('/v1/notifications/:id/read', async (req, reply) => {
    const user = await requireUser(req);
    await markNotificationRead(deps, user.id, idParam.parse(req.params).id);
    return reply.status(204).send();
  });
  app.post('/v1/notifications/read-all', async (req, reply) => {
    await markAllNotificationsRead(deps, (await requireUser(req)).id);
    return reply.status(204).send();
  });

  // ── Solo desarrollo: correos simulados (EMAIL_PROVIDER=log) ─────────────────────
  app.get('/v1/dev/emails', async () => {
    if (!config.demoAuth || !config.outbox) throw new NotFoundError('Ruta');
    return { items: config.outbox() };
  });

  return app;
}
