/**
 * Flujo núcleo del reclutador: ranking por match, cambio de estatus con If-Match,
 * aislamiento por organización y postulaciones estancadas (3/5 días).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { testApp } from '../support/app.js';

let ctx: Awaited<ReturnType<typeof testApp>>;
beforeEach(async () => {
  ctx = await testApp();
});
afterEach(() => ctx.app.close());

const patch = (id: string, headers: Record<string, string>, status: string, version?: number) =>
  ctx.app.inject({
    method: 'PATCH',
    url: `/v1/applications/${id}/status`,
    headers: version === undefined ? headers : { ...headers, 'if-match': `"${version}"` },
    payload: { status },
  });

describe('flujo del reclutador', () => {
  it('lista candidatos de su vacante ordenados por match', async () => {
    const cand = await ctx.login('candidato@example.com');
    await ctx.app.inject({ method: 'POST', url: '/v1/jobs/job_backend_node/applications', headers: cand });
    const ana = await ctx.login('candidata@example.com');
    await ctx.app.inject({ method: 'POST', url: '/v1/jobs/job_backend_node/applications', headers: ana });

    const h = await ctx.login('reclutador@example.com');
    const res = await ctx.app.inject({ url: '/v1/jobs/job_backend_node/applications', headers: h });
    const items = res.json().items as { matchScore: number; candidate: { fullName: string } }[];

    expect(items).toHaveLength(2);
    expect(items[0]!.candidate.fullName).toBe('Ana Ejemplo');
    expect(items[0]!.matchScore).toBeGreaterThan(items[1]!.matchScore);
  });

  it('cambia estatus con If-Match, actualiza el stepper del candidato y devuelve nuevo ETag', async () => {
    const h = await ctx.login('reclutador@example.com');
    const res = await patch('app_ana_frontend', h, 'interview_scheduled', 3);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'interview_scheduled', version: 4 });
    expect(res.headers.etag).toBe('"4"');

    const ana = await ctx.login('candidata@example.com');
    const dash = (await ctx.app.inject({ url: '/v1/bff/candidate/dashboard', headers: ana })).json();
    const item = dash.applications.find((a: { id: string }) => a.id === 'app_ana_frontend');
    expect(item.stepper.current).toBe('interview_scheduled');
  });

  it('sin If-Match → 428; versión vieja → 412', async () => {
    const h = await ctx.login('reclutador@example.com');
    expect((await patch('app_ana_frontend', h, 'interview_scheduled')).statusCode).toBe(428);
    expect((await patch('app_ana_frontend', h, 'interview_scheduled', 1)).statusCode).toBe(412);
  });

  it('transición inválida → 409 con from/to', async () => {
    const h = await ctx.login('reclutador@example.com');
    const res = await patch('app_ana_frontend', h, 'hired', 3);
    expect(res.statusCode).toBe(409);
    expect(res.json().details).toEqual({ from: 'shortlisted', to: 'hired' });
  });

  it('estatus no permitido para el reclutador (withdrawn) → 422', async () => {
    const h = await ctx.login('reclutador@example.com');
    expect((await patch('app_ana_frontend', h, 'withdrawn', 3)).statusCode).toBe(422);
  });

  it('no ve ni modifica postulaciones de otra organización (404)', async () => {
    const h = await ctx.login('reclutador@example.com'); // org_fintech
    expect((await patch('app_luis_java', h, 'shortlisted', 2)).statusCode).toBe(404);
    expect((await ctx.app.inject({ url: '/v1/jobs/job_java_retail/applications', headers: h })).statusCode).toBe(404);
  });

  it('contratar incrementa posiciones cubiertas', async () => {
    const h = await ctx.login('reclutador@example.com');
    let v = 3;
    for (const s of ['interview_scheduled', 'interview_done', 'offer', 'hired']) {
      const r = await patch('app_ana_frontend', h, s, v);
      expect(r.statusCode).toBe(200);
      v = r.json().version;
    }
    const job = (await ctx.app.inject({ url: '/v1/jobs/job_frontend_react' })).json();
    expect(job.positionsAvailable).toBe(0);
  });

  it('dashboard del empleador marca postulaciones estancadas a 3 (warning) y 5 días (escalated)', async () => {
    const fintech = await ctx.login('reclutador@example.com');
    const f = (await ctx.app.inject({ url: '/v1/bff/employer/dashboard', headers: fintech })).json();
    expect(f.staleApplications).toEqual([expect.objectContaining({ applicationId: 'app_ana_platform', staleDays: 4, level: 'warning' })]);
    expect(f.jobs.every((j: { id: string }) => !j.id.includes('retail'))).toBe(true);

    const retail = await ctx.login('reclutadora@example.com');
    const r = (await ctx.app.inject({ url: '/v1/bff/employer/dashboard', headers: retail })).json();
    expect(r.staleApplications).toEqual([expect.objectContaining({ applicationId: 'app_luis_java', staleDays: 6, level: 'escalated' })]);
  });
});

describe('GET /v1/jobs con filtros', () => {
  it('acepta listas CSV en la query y devuelve total, página y facetas', async () => {
    const res = await ctx.app.inject({ url: '/v1/jobs?modality=remote,hybrid&seniority=senior&sort=salary_desc&pageSize=2' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ total: 24, page: 1, pageSize: 2 });
    expect(body.items.map((j: { id: string }) => j.id)).toEqual(['job_turismo_10', 'job_salud_ml']);
    expect(body.facets.modality).toEqual({ remote: 14, hybrid: 10, onsite: 8 }); // respeta seniority=senior, ignora su propio filtro
  });

  it('valida los filtros (422)', async () => {
    expect((await ctx.app.inject({ url: '/v1/jobs?modality=marte' })).statusCode).toBe(422);
    expect((await ctx.app.inject({ url: '/v1/jobs?sort=random' })).statusCode).toBe(422);
  });
});

describe('vacantes urgentes', () => {
  it('GET /v1/jobs?urgent=true devuelve solo urgentes y el detalle expone la marca', async () => {
    const res = await ctx.app.inject({ url: '/v1/jobs?urgent=true&pageSize=50' });
    expect(res.json().total).toBe(18);
    expect(res.json().items.every((j: { urgent: boolean }) => j.urgent)).toBe(true);
    expect((await ctx.app.inject({ url: '/v1/jobs/job_platform' })).json().urgent).toBe(true);
    expect((await ctx.app.inject({ url: '/v1/jobs/job_backend_node' })).json().urgent).toBe(false);
  });

  it('el empleador marca y desmarca una vacante como urgente', async () => {
    const h = await ctx.login('reclutador@example.com');
    const job = (await ctx.app.inject({ url: '/v1/employer/jobs/job_backend_node', headers: h })).json();
    const body = {
      title: job.title, description: job.description, seniority: job.seniority, modality: job.modality, country: job.country,
      salaryMin: job.salary.min, salaryMax: job.salary.max, positionsTotal: job.positionsTotal,
      skills: job.skills.map((s: { name: string; level: number; mustHave: boolean }) => ({ name: s.name, level: s.level, mustHave: s.mustHave })),
    };
    const on = await ctx.app.inject({ method: 'PUT', url: '/v1/employer/jobs/job_backend_node', headers: h, payload: { ...body, urgent: true } });
    expect(on.json().urgent).toBe(true);
    const off = await ctx.app.inject({ method: 'PUT', url: '/v1/employer/jobs/job_backend_node', headers: h, payload: body });
    expect(off.json().urgent).toBe(false);
  });
});
