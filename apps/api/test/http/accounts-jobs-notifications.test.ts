/**
 * Change add-accounts-jobs-notifications: registro y login con contraseña, perfil del candidato,
 * gestión e importación de vacantes, cierre (soft delete) y notificaciones in-app + email.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEMO_PASSWORD } from '../../src/seed/seed-data.js';
import { testApp, tinyPdf } from '../support/app.js';

let ctx: Awaited<ReturnType<typeof testApp>>;
beforeEach(async () => {
  ctx = await testApp();
});
afterEach(() => ctx.app.close());

const post = (url: string, payload?: unknown, headers: Record<string, string> = {}) =>
  ctx.app.inject({ method: 'POST', url, payload: payload as never, headers });
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

const JOB = {
  title: 'QA Automation Engineer',
  description: 'Automatización de pruebas E2E con Playwright y APIs.',
  seniority: 'mid',
  modality: 'remote',
  country: 'MX',
  salaryMin: 2500,
  salaryMax: 3500,
  positionsTotal: 2,
  skills: [{ name: 'Testing automatizado', level: 4, mustHave: true }, { name: 'TypeScript', level: 3 }],
};

describe('registro y login', () => {
  it('registra candidato, entra con contraseña y obtiene perfil vacío', async () => {
    const reg = await post('/v1/auth/register/candidate', {
      fullName: 'Carla Registro', email: 'Carla@Example.com', password: 'Segura123', country: 'mx', acceptPrivacy: true,
    });
    expect(reg.statusCode).toBe(201);
    expect(reg.json().user).toMatchObject({ email: 'carla@example.com', role: 'candidate' });

    const login = await post('/v1/auth/login', { email: 'carla@example.com', password: 'Segura123', kind: 'candidate' });
    expect(login.statusCode).toBe(200);
    const profile = await ctx.app.inject({ url: '/v1/candidates/me', headers: bearer(login.json().token) });
    expect(profile.json()).toMatchObject({ fullName: 'Carla Registro', country: 'MX', skills: [], hasResume: false });
  });

  it('rechaza correo duplicado (409), contraseña débil y aviso de privacidad sin aceptar (422)', async () => {
    const base = { fullName: 'Ana Dos', email: 'candidata@example.com', password: 'Segura123', acceptPrivacy: true };
    expect((await post('/v1/auth/register/candidate', base)).statusCode).toBe(409);
    expect((await post('/v1/auth/register/candidate', { ...base, email: 'x@example.com', password: 'corta' })).statusCode).toBe(422);
    expect((await post('/v1/auth/register/candidate', { ...base, email: 'y@example.com', acceptPrivacy: false })).statusCode).toBe(422);
  });

  it('registra empleador con su organización (employer_admin)', async () => {
    const reg = await post('/v1/auth/register/employer', {
      companyName: 'Logística Ejemplo', fullName: 'Elena Empleadora', email: 'elena@example.com', password: 'Segura123', acceptPrivacy: true,
    });
    expect(reg.statusCode).toBe(201);
    expect(reg.json().user).toMatchObject({ role: 'employer_admin', organizationId: expect.stringMatching(/^org_/) });
    const dash = await ctx.app.inject({ url: '/v1/bff/employer/dashboard', headers: bearer(reg.json().token) });
    expect(dash.json()).toEqual({ jobs: [], staleApplications: [] });
  });

  it('el login separa candidato y empleador y no revela qué falló', async () => {
    const wrongKind = await post('/v1/auth/login', { email: 'reclutador@example.com', password: DEMO_PASSWORD, kind: 'candidate' });
    const wrongPass = await post('/v1/auth/login', { email: 'reclutador@example.com', password: 'Otra1234', kind: 'employer' });
    const noUser = await post('/v1/auth/login', { email: 'nadie@example.com', password: 'Otra1234', kind: 'employer' });
    for (const r of [wrongKind, wrongPass, noUser]) {
      expect(r.statusCode).toBe(401);
      expect(r.json().title).toBe(wrongKind.json().title);
    }
    const ok = await post('/v1/auth/login', { email: 'reclutador@example.com', password: DEMO_PASSWORD, kind: 'employer' });
    expect(ok.json().user.organizationId).toBe('org_fintech');
  });
});

describe('perfil del candidato', () => {
  it('actualiza datos profesionales y el match se recalcula', async () => {
    const h = await ctx.login('candidata@example.com');
    const before = (await ctx.app.inject({ url: '/v1/jobs/job_backend_node/match', headers: h })).json();
    const res = await ctx.app.inject({
      method: 'PUT', url: '/v1/candidates/me', headers: h,
      payload: { fullName: 'Ana Ejemplo', headline: 'Backend senior', seniority: 'lead', country: 'MX', preferredModalities: ['remote'], salaryExpectation: 4800 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ seniority: 'lead', salaryExpectation: 4800 });
    const after = (await ctx.app.inject({ url: '/v1/jobs/job_backend_node/match', headers: h })).json();
    expect(after.factors.seniorityFit).toBeGreaterThanOrEqual(before.factors.seniorityFit);
  });

  it('sube el CV como PDF o texto y la IA propone skills', async () => {
    const h = await ctx.login('nueva@example.com');
    const pdf = tinyPdf([['Sofia Demo - Desarrolladora', 'Experiencia avanzada en TypeScript y Node.js.', 'Uso diario de PostgreSQL y Docker.']]);
    const res = await ctx.app.inject({ method: 'POST', url: '/v1/candidates/me/resume/file', headers: { ...h, 'content-type': 'application/pdf' }, payload: pdf });
    expect(res.statusCode).toBe(200);
    expect(res.json().proposedSkills.map((s: { name: string }) => s.name)).toEqual(expect.arrayContaining(['TypeScript', 'Node.js', 'PostgreSQL']));

    const txt = await ctx.app.inject({
      method: 'POST', url: '/v1/candidates/me/resume/file', headers: { ...h, 'content-type': 'text/plain' },
      payload: 'Analista con experiencia en SQL, Python y Power BI para reportes de negocio.',
    });
    expect(txt.json().proposedSkills.map((s: { name: string }) => s.name)).toEqual(expect.arrayContaining(['SQL', 'Python']));
  });

  it('rechaza un "PDF" que no lo es', async () => {
    const h = await ctx.login('nueva@example.com');
    const res = await ctx.app.inject({ method: 'POST', url: '/v1/candidates/me/resume/file', headers: { ...h, 'content-type': 'application/pdf' }, payload: 'no soy pdf' });
    expect(res.statusCode).toBe(422);
  });
});

describe('gestión de vacantes', () => {
  it('crea en borrador, edita, publica y aparece en el catálogo; otra organización recibe 404', async () => {
    const h = await ctx.login('reclutador@example.com');
    const created = await post('/v1/employer/jobs', JOB, h);
    expect(created.statusCode).toBe(201);
    const id = created.json().id;
    expect(created.json()).toMatchObject({ status: 'draft', sourceType: 'manual' });
    expect((await ctx.app.inject({ url: `/v1/jobs/${id}` })).statusCode).toBe(404);

    const edited = await ctx.app.inject({ method: 'PUT', url: `/v1/employer/jobs/${id}`, headers: h, payload: { ...JOB, positionsTotal: 3 } });
    expect(edited.json().positionsTotal).toBe(3);

    expect((await post(`/v1/employer/jobs/${id}/publish`, undefined, h)).json().status).toBe('published');
    expect((await ctx.app.inject({ url: '/v1/jobs?q=QA Automation' })).json().items.map((j: { id: string }) => j.id)).toContain(id);

    const retail = await ctx.login('reclutadora@example.com');
    expect((await ctx.app.inject({ url: `/v1/employer/jobs/${id}`, headers: retail })).statusCode).toBe(404);
    expect((await post(`/v1/employer/jobs/${id}/close`, undefined, retail)).statusCode).toBe(404);
  });

  it('el salario es en USD: sin moneda se asume USD y otra moneda se rechaza (422)', async () => {
    const h = await ctx.login('reclutador@example.com');
    const created = await post('/v1/employer/jobs', JOB, h);
    expect(created.json().salary).toEqual({ min: 2500, max: 3500, currency: 'USD' });
    const mxn = await post('/v1/employer/jobs', { ...JOB, currency: 'MXN' }, h);
    expect(mxn.statusCode).toBe(422);
    expect(mxn.json().errors[0].message).toContain('USD');
  });

  it('valida skills desconocidas y salario incoherente (422); candidatos no gestionan vacantes (403)', async () => {
    const h = await ctx.login('reclutador@example.com');
    expect((await post('/v1/employer/jobs', { ...JOB, skills: [{ name: 'COBOL', level: 3 }] }, h)).statusCode).toBe(422);
    expect((await post('/v1/employer/jobs', { ...JOB, salaryMin: 9000 }, h)).statusCode).toBe(422);
    expect((await post('/v1/employer/jobs', JOB, await ctx.login('candidata@example.com'))).statusCode).toBe(403);
  });

  it('cerrar (soft delete) notifica a los candidatos con postulación activa, in-app y por email', async () => {
    const h = await ctx.login('reclutador@example.com');
    const closed = await post('/v1/employer/jobs/job_frontend_react/close', undefined, h);
    expect(closed.statusCode).toBe(200);
    expect(closed.json()).toMatchObject({ status: 'closed', notifiedCandidates: 1, closedAt: expect.any(String) });

    // Ya no está en el catálogo ni acepta postulaciones, pero sigue en el historial del candidato.
    expect((await ctx.app.inject({ url: '/v1/jobs/job_frontend_react' })).statusCode).toBe(404);
    const ana = await ctx.login('candidata@example.com');
    const dash = (await ctx.app.inject({ url: '/v1/bff/candidate/dashboard', headers: ana })).json();
    expect(dash.applications.find((a: { id: string }) => a.id === 'app_ana_frontend').job.status).toBe('closed');

    const notes = (await ctx.app.inject({ url: '/v1/notifications?unread=true', headers: ana })).json();
    expect(notes.unreadCount).toBe(1);
    expect(notes.items[0]).toMatchObject({ kind: 'job_closed', data: { jobId: 'job_frontend_react' } });
    expect(ctx.outbox()).toEqual([expect.objectContaining({ to: 'candidata@example.com', subject: expect.stringContaining('Vacante cerrada') })]);

    expect((await post('/v1/employer/jobs/job_frontend_react/close', undefined, h)).statusCode).toBe(409);
    expect((await ctx.app.inject({ method: 'PUT', url: '/v1/employer/jobs/job_frontend_react', headers: h, payload: JOB })).statusCode).toBe(409);
  });
});

describe('importación de vacantes', () => {
  const CSV = `externalId,title,description,seniority,modality,country,city,salaryMin,salaryMax,currency,positions,skills
EXT-1,Data Engineer,"Pipelines de datos, batch y streaming.",senior,remote,MX,,4500,5500,USD,1,"Python:4:must;SQL:4;AWS:3;Fortran:2"
EXT-2,Sin descripción,,mid,remote,MX,,,,USD,1,SQL:3`;

  it('CSV: crea borradores, reporta errores por fila y advierte skills no reconocidas; reimportar actualiza', async () => {
    const h = await ctx.login('reclutador@example.com');
    const csv = { ...h, 'content-type': 'text/csv' };
    const r = await ctx.app.inject({ method: 'POST', url: '/v1/employer/jobs/imports?format=csv', headers: csv, payload: CSV });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ created: 1, updated: 0, errors: [{ row: 2, message: expect.stringContaining('description') }] });
    expect(r.json().items[0]).toMatchObject({ status: 'draft', warnings: [expect.stringContaining('Fortran')] });

    const again = await ctx.app.inject({ method: 'POST', url: '/v1/employer/jobs/imports?format=csv&publish=true', headers: csv, payload: CSV });
    expect(again.json()).toMatchObject({ created: 0, updated: 1 });
    expect(again.json().items[0].status).toBe('published');
  });

  it('JSON CanonicalJob (1..N) con publish=true', async () => {
    const h = await ctx.login('reclutadora@example.com');
    const payload = [{
      externalId: 'REQ-77', title: 'Gerente de tienda', description: 'Liderazgo de equipo y ventas.', seniority: 'lead',
      location: { country: 'MX', city: 'Monterrey', modality: 'onsite' }, positions: 1, skills: [{ name: 'Liderazgo', level: 4, mustHave: true }],
    }];
    const r = await ctx.app.inject({ method: 'POST', url: '/v1/employer/jobs/imports?format=json&publish=true', headers: h, payload });
    expect(r.json()).toMatchObject({ created: 1, items: [{ status: 'published' }] });
  });

  it('PDF con varias vacantes: skills propuestas por IA y siempre en borrador', async () => {
    const h = await ctx.login('reclutadora@example.com');
    const pdf = tinyPdf([
      ['Vacante: Desarrollador Java', 'Nivel: Senior', 'Modalidad: Presencial', 'Buscamos Java, Spring Boot y SQL.'],
      ['Vacante: Analista BI', 'Modalidad: Remoto', 'Reportes con SQL y Power BI.'],
    ]);
    const r = await ctx.app.inject({ method: 'POST', url: '/v1/employer/jobs/imports?format=pdf&publish=true', headers: { ...h, 'content-type': 'application/pdf' }, payload: pdf });
    expect(r.statusCode).toBe(200);
    expect(r.json().created).toBe(2);
    expect(r.json().items.every((i: { status: string }) => i.status === 'draft')).toBe(true);
    const job = (await ctx.app.inject({ url: `/v1/employer/jobs/${r.json().items[0].jobId}`, headers: h })).json();
    expect(job.skills.map((s: { name: string }) => s.name)).toEqual(expect.arrayContaining(['Java', 'Spring Boot']));
    expect(job.sourceType).toBe('pdf');
  });
});

describe('notificaciones por cambio de estatus', () => {
  it('preseleccionar notifica "selected" in-app y por email; marcar como leída', async () => {
    const rec = await ctx.login('reclutador@example.com');
    const r = await ctx.app.inject({
      method: 'PATCH', url: '/v1/applications/app_ana_platform/status', headers: { ...rec, 'if-match': '"1"' }, payload: { status: 'in_review' },
    });
    expect(r.statusCode).toBe(200);
    await ctx.app.inject({ method: 'PATCH', url: '/v1/applications/app_ana_platform/status', headers: { ...rec, 'if-match': '"2"' }, payload: { status: 'shortlisted' } });

    const ana = await ctx.login('candidata@example.com');
    const notes = (await ctx.app.inject({ url: '/v1/notifications', headers: ana })).json();
    expect(notes.items.map((n: { kind: string }) => n.kind)).toEqual(['selected', 'status_changed']);
    expect(ctx.outbox()).toHaveLength(1); // solo la preselección va por email
    expect((await ctx.app.inject({ url: '/v1/dev/emails' })).json().items[0].subject).toContain('preseleccionado');

    const id = notes.items[0].id;
    expect((await post(`/v1/notifications/${id}/read`, undefined, ana)).statusCode).toBe(204);
    expect((await post(`/v1/notifications/${id}/read`, undefined, rec)).statusCode).toBe(404);
    await post('/v1/notifications/read-all', undefined, ana);
    expect((await ctx.app.inject({ url: '/v1/notifications?unread=true', headers: ana })).json().unreadCount).toBe(0);
  });
});

describe('importación con moneda distinta de USD', () => {
  it('reporta la fila con error y no la importa', async () => {
    const h = await ctx.login('reclutador@example.com');
    const csv = `externalId,title,description,seniority,modality,country,city,salaryMin,salaryMax,currency,positions,skills
MXN-1,Cajero,"Atención en sucursal.",junior,onsite,MX,,8000,9000,MXN,1,Comunicación:3`;
    const r = await ctx.app.inject({ method: 'POST', url: '/v1/employer/jobs/imports?format=csv', headers: { ...h, 'content-type': 'text/csv' }, payload: csv });
    expect(r.json()).toMatchObject({ created: 0, errors: [{ row: 1, message: expect.stringContaining('USD') }] });
  });
});

describe('soft skills opcionales en vacantes', () => {
  it('se registran aparte (softSkills), se guardan con su categoría y no se aceptan skills técnicas como soft', async () => {
    const h = await ctx.login('reclutador@example.com');
    const created = await post('/v1/employer/jobs', { ...JOB, softSkills: [{ name: 'Comunicación', level: 4 }, { name: 'Resolución de problemas', level: 3 }] }, h);
    expect(created.statusCode).toBe(201);
    const soft = created.json().skills.filter((s: { category: string }) => s.category === 'Soft skills').map((s: { name: string }) => s.name);
    expect(soft).toEqual(['Comunicación', 'Resolución de problemas']);

    expect((await post('/v1/employer/jobs', JOB, h)).statusCode).toBe(201); // sin soft skills: opcional
    const bad = await post('/v1/employer/jobs', { ...JOB, softSkills: [{ name: 'TypeScript', level: 3 }] }, h);
    expect(bad.statusCode).toBe(422);
    expect(bad.json().title).toContain('TypeScript');
  });

  it('CSV con columna softSkills y catálogo sembrado con y sin soft skills', async () => {
    const h = await ctx.login('reclutador@example.com');
    const csv = `externalId,title,description,seniority,modality,country,city,salaryMin,salaryMax,currency,positions,skills,urgent,softSkills
SOFT-1,Analista Soft,"Analiza datos del negocio.",mid,remote,MX,,2000,3000,USD,1,SQL:3:must,no,"Empatía:4;Negociación:3"`;
    const r = await ctx.app.inject({ method: 'POST', url: '/v1/employer/jobs/imports?format=csv', headers: { ...h, 'content-type': 'text/csv' }, payload: csv });
    const job = (await ctx.app.inject({ url: `/v1/employer/jobs/${r.json().items[0].jobId}`, headers: h })).json();
    expect(job.skills.map((s: { name: string }) => s.name)).toEqual(['SQL', 'Empatía', 'Negociación']);

    const all = (await ctx.app.inject({ url: '/v1/jobs?pageSize=50&page=2' })).json().items as { skills: { category: string }[] }[];
    const withSoft = all.filter((j) => j.skills.some((s) => s.category === 'Soft skills')).length;
    expect(withSoft).toBeGreaterThan(0);
    expect(withSoft).toBeLessThan(all.length);
  });
});
