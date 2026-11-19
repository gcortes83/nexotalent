/**
 * Flujo núcleo del candidato de punta a punta (HU-01, HU-02, HU-04):
 * subir CV → confirmar skills → radar y score → postular → stepper.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { testApp } from '../support/app.js';

let ctx: Awaited<ReturnType<typeof testApp>>;
beforeEach(async () => {
  ctx = await testApp();
});
afterEach(() => ctx.app.close());

const CV = `Sofía Demo — Desarrolladora backend.
Experiencia avanzada en TypeScript y Node.js construyendo APIs con Fastify.
Uso diario de PostgreSQL y Docker; nociones de AWS. Inglés intermedio. Git y TDD con Vitest.`;

describe('flujo del candidato', () => {
  it('candidata sin skills ve score 0 y la invitación a confirmar', async () => {
    const h = await ctx.login('nueva@example.com');
    const res = await ctx.app.inject({ url: '/v1/jobs/job_backend_node/match', headers: h });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ score: 0, scorePercent: 0 });
    expect(res.json().radar.every((p: { candidate: number }) => p.candidate === 0)).toBe(true);
  });

  it('sube CV, la IA propone skills sin confirmar y el match no cambia hasta confirmarlas', async () => {
    const h = await ctx.login('nueva@example.com');
    const upload = await ctx.app.inject({ method: 'POST', url: '/v1/candidates/me/resume', headers: h, payload: { text: CV } });

    expect(upload.statusCode).toBe(200);
    const proposed = upload.json().proposedSkills as { skillId: string; name: string; level: number; confirmed: boolean }[];
    expect(proposed.map((s) => s.name)).toEqual(expect.arrayContaining(['TypeScript', 'Node.js', 'PostgreSQL', 'Fastify']));
    expect(proposed.every((s) => s.confirmed === false)).toBe(true);
    expect(proposed.find((s) => s.name === 'TypeScript')?.level).toBe(4); // "avanzada"
    expect(proposed.find((s) => s.name === 'AWS')?.level).toBe(2); // "nociones"

    const before = await ctx.app.inject({ url: '/v1/jobs/job_backend_node/match', headers: h });
    expect(before.json().score).toBe(0);

    const confirm = await ctx.app.inject({
      method: 'PUT',
      url: '/v1/candidates/me/skills',
      headers: h,
      payload: { skills: proposed.map(({ skillId, level }) => ({ skillId, level })) },
    });
    expect(confirm.statusCode).toBe(200);

    const after = await ctx.app.inject({ url: '/v1/jobs/job_backend_node/match', headers: h });
    expect(after.json().score).toBeGreaterThan(0.5);
    expect(after.json().radar.length).toBeGreaterThanOrEqual(3);
  });

  it('devuelve ETag y 304 con If-None-Match; confirmar skills invalida la caché', async () => {
    const h = await ctx.login('candidata@example.com');
    const first = await ctx.app.inject({ url: '/v1/jobs/job_backend_node/match', headers: h });
    const etag = first.headers.etag as string;
    expect(etag).toBeTruthy();

    const second = await ctx.app.inject({ url: '/v1/jobs/job_backend_node/match', headers: { ...h, 'if-none-match': etag } });
    expect(second.statusCode).toBe(304);

    ctx.clock.set('2026-11-17T13:00:00.000Z');
    await ctx.app.inject({
      method: 'PUT',
      url: '/v1/candidates/me/skills',
      headers: h,
      payload: { skills: [{ skillId: 'sk_typescript', level: 5 }] },
    });
    const third = await ctx.app.inject({ url: '/v1/jobs/job_backend_node/match', headers: { ...h, 'if-none-match': etag } });
    expect(third.statusCode).toBe(200);
    expect(third.headers.etag).not.toBe(etag);
  });

  it('vacante no publicada → 404 en el match', async () => {
    const h = await ctx.login('candidata@example.com');
    const res = await ctx.app.inject({ url: '/v1/jobs/job_draft/match', headers: h });
    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toContain('application/problem+json');
  });

  it('postula, aparece en el dashboard con stepper y no puede postular dos veces', async () => {
    const h = await ctx.login('candidata@example.com');
    const apply = await ctx.app.inject({ method: 'POST', url: '/v1/jobs/job_backend_node/applications', headers: h });
    expect(apply.statusCode).toBe(201);
    expect(apply.json()).toMatchObject({ status: 'submitted', version: 1 });
    expect(apply.json().matchScore).toBeGreaterThan(0);

    const again = await ctx.app.inject({ method: 'POST', url: '/v1/jobs/job_backend_node/applications', headers: h });
    expect(again.statusCode).toBe(409);

    const dash = await ctx.app.inject({ url: '/v1/bff/candidate/dashboard', headers: h });
    const item = dash.json().applications.find((a: { jobId: string }) => a.jobId === 'job_backend_node');
    expect(item.stepper.current).toBe('submitted');
    expect(item.stepper.steps[0]).toMatchObject({ key: 'submitted', state: 'current' });
    expect(dash.json().recommendedJobs.every((j: { id: string }) => j.id !== 'job_backend_node')).toBe(true);

    const job = await ctx.app.inject({ url: '/v1/jobs/job_backend_node' });
    expect(job.json().applicantsCount).toBe(1);
  });

  it('el candidato puede retirarse y el contador de postulantes baja', async () => {
    const h = await ctx.login('candidata@example.com');
    const res = await ctx.app.inject({ method: 'POST', url: '/v1/applications/app_ana_platform/withdraw', headers: h });
    expect(res.json().status).toBe('withdrawn');
    const job = await ctx.app.inject({ url: '/v1/jobs/job_platform' });
    expect(job.json().applicantsCount).toBe(0);
  });

  it('no puede retirar postulaciones ajenas', async () => {
    const h = await ctx.login('candidata@example.com');
    const res = await ctx.app.inject({ method: 'POST', url: '/v1/applications/app_luis_java/withdraw', headers: h });
    expect(res.statusCode).toBe(404);
  });
});

describe('autenticación y validación', () => {
  it('sin token → 401 Problem Details', async () => {
    const res = await ctx.app.inject({ url: '/v1/bff/candidate/dashboard' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ status: 401, title: 'Autenticación requerida' });
  });

  it('un reclutador no puede usar endpoints de candidato → 403', async () => {
    const h = await ctx.login('reclutador@example.com');
    expect((await ctx.app.inject({ url: '/v1/bff/candidate/dashboard', headers: h })).statusCode).toBe(403);
  });

  it('skills desconocidas o niveles inválidos → 422', async () => {
    const h = await ctx.login('candidata@example.com');
    const bad = await ctx.app.inject({ method: 'PUT', url: '/v1/candidates/me/skills', headers: h, payload: { skills: [{ skillId: 'sk_cobol', level: 3 }] } });
    expect(bad.statusCode).toBe(422);
    const lvl = await ctx.app.inject({ method: 'PUT', url: '/v1/candidates/me/skills', headers: h, payload: { skills: [{ skillId: 'sk_go', level: 9 }] } });
    expect(lvl.statusCode).toBe(422);
  });

  it('lista pública de vacantes solo muestra publicadas y filtra por texto', async () => {
    const all = (await ctx.app.inject({ url: '/v1/jobs' })).json().items as { id: string }[];
    expect(all.some((j) => j.id === 'job_draft')).toBe(false);
    const q = (await ctx.app.inject({ url: '/v1/jobs?q=react' })).json().items as { title: string }[];
    expect(q.length).toBeGreaterThan(0);
  });
});
