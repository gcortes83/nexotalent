/**
 * Funcionales en vivo del change add-accounts-jobs-notifications (UC-11..UC-16) contra la API levantada.
 * Correos únicos por corrida → re-ejecutables.
 */
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { API_URL, assertProblem, call, requireUp } from './helpers.mjs';

const run = Date.now().toString(36);
const PASSWORD = 'Segura123';
const ctx = {};

before(() => requireUp(API_URL, 'La API'));

describe('UC-11 · registro y login con contraseña', () => {
  it('registra empleador (crea organización) y candidato', async () => {
    const e = await call('POST', '/v1/auth/register/employer', {
      body: { companyName: `Func ${run}`, fullName: 'Func Empleador', email: `func-emp-${run}@example.com`, password: PASSWORD, acceptPrivacy: true },
    });
    assert.equal(e.status, 201, e.text);
    assert.equal(e.json.user.role, 'employer_admin');
    ctx.employer = e.json.token;

    const c = await call('POST', '/v1/auth/register/candidate', {
      body: { fullName: 'Func Candidata', email: `func-cand-${run}@example.com`, password: PASSWORD, acceptPrivacy: true },
    });
    assert.equal(c.status, 201, c.text);
    ctx.candidate = c.json.token;
  });

  it('login separa tipo de cuenta; duplicados 409; contraseña débil 422', async () => {
    const ok = await call('POST', '/v1/auth/login', { body: { email: `func-cand-${run}@example.com`, password: PASSWORD, kind: 'candidate' } });
    assert.equal(ok.status, 200);
    assertProblem(await call('POST', '/v1/auth/login', { body: { email: `func-cand-${run}@example.com`, password: PASSWORD, kind: 'employer' } }), 401);
    assertProblem(await call('POST', '/v1/auth/register/candidate', {
      body: { fullName: 'Duplicada', email: `func-cand-${run}@example.com`, password: PASSWORD, acceptPrivacy: true },
    }), 409);
    assertProblem(await call('POST', '/v1/auth/register/candidate', {
      body: { fullName: 'Xx', email: `weak-${run}@example.com`, password: 'abc', acceptPrivacy: true },
    }), 422);
  });

  it('las cuentas sembradas entran con la contraseña de demo', async () => {
    const r = await call('POST', '/v1/auth/login', { body: { email: 'reclutador@example.com', password: 'Demo1234', kind: 'employer' } });
    assert.equal(r.status, 200, r.text);
  });
});

describe('UC-12 · perfil del candidato', () => {
  it('actualiza datos y sube CV como texto', async () => {
    const p = await call('PUT', '/v1/candidates/me', {
      token: ctx.candidate,
      body: { fullName: 'Func Candidata', headline: 'QA', seniority: 'mid', country: 'MX', preferredModalities: ['remote'], salaryExpectation: 2800 },
    });
    assert.equal(p.status, 200, p.text);
    assert.equal(p.json.seniority, 'mid');

    const res = await fetch(`${API_URL}/v1/candidates/me/resume/file`, {
      method: 'POST',
      headers: { authorization: `Bearer ${ctx.candidate}`, 'content-type': 'text/plain' },
      body: 'Experiencia avanzada en testing automatizado, TypeScript y SQL. Git diario.',
    });
    const json = await res.json();
    assert.equal(res.status, 200);
    const skills = json.proposedSkills.map((s) => ({ skillId: s.skillId, level: s.level }));
    assert.ok(skills.length >= 2);
    assert.equal((await call('PUT', '/v1/candidates/me/skills', { token: ctx.candidate, body: { skills } })).status, 200);
  });
});

describe('UC-13 · gestión de vacantes', () => {
  it('crea borrador, publica, edita y lista (aislado por organización)', async () => {
    const job = {
      title: `QA Func ${run}`, description: 'Pruebas automatizadas end to end.', seniority: 'mid', modality: 'remote', country: 'MX',
      positionsTotal: 1, skills: [{ name: 'Testing automatizado', level: 3, mustHave: true }, { name: 'SQL', level: 3 }],
    };
    const created = await call('POST', '/v1/employer/jobs', { token: ctx.employer, body: job });
    assert.equal(created.status, 201, created.text);
    assert.equal(created.json.status, 'draft');
    ctx.jobId = created.json.id;

    assert.equal((await call('POST', `/v1/employer/jobs/${ctx.jobId}/publish`, { token: ctx.employer })).json.status, 'published');
    assert.equal((await call('PUT', `/v1/employer/jobs/${ctx.jobId}`, { token: ctx.employer, body: { ...job, positionsTotal: 2 } })).json.positionsTotal, 2);
    const list = await call('GET', '/v1/employer/jobs', { token: ctx.employer });
    assert.deepEqual(list.json.items.map((j) => j.id), [ctx.jobId]);

    const other = (await call('POST', '/v1/auth/login', { body: { email: 'reclutador@example.com', password: 'Demo1234', kind: 'employer' } })).json.token;
    assertProblem(await call('GET', `/v1/employer/jobs/${ctx.jobId}`, { token: other }), 404);
    assertProblem(await call('POST', '/v1/employer/jobs', { token: ctx.candidate, body: job }), 403);
  });
});

describe('UC-14 · notificación por preselección (in-app + email)', () => {
  it('la candidata se postula, el empleador la preselecciona y recibe notificación "selected"', async () => {
    const app = await call('POST', `/v1/jobs/${ctx.jobId}/applications`, { token: ctx.candidate });
    assert.equal(app.status, 201, app.text);
    ctx.appId = app.json.id;
    for (const [status, v] of [['in_review', 1], ['shortlisted', 2]]) {
      const r = await call('PATCH', `/v1/applications/${ctx.appId}/status`, { token: ctx.employer, body: { status }, headers: { 'if-match': `"${v}"` } });
      assert.equal(r.status, 200, r.text);
    }
    const notes = await call('GET', '/v1/notifications?unread=true', { token: ctx.candidate });
    assert.equal(notes.status, 200);
    assert.ok(notes.json.items.some((n) => n.kind === 'selected' && n.data.applicationId === ctx.appId));
  });
});

describe('UC-15 · cerrar vacante (soft delete) notifica a postulantes', () => {
  it('cierra, avisa y deja la vacante en el historial de la candidata', async () => {
    const r = await call('POST', `/v1/employer/jobs/${ctx.jobId}/close`, { token: ctx.employer });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.status, 'closed');
    assert.equal(r.json.notifiedCandidates, 1);
    assertProblem(await call('GET', `/v1/jobs/${ctx.jobId}`), 404);
    assertProblem(await call('POST', `/v1/employer/jobs/${ctx.jobId}/close`, { token: ctx.employer }), 409);

    const notes = await call('GET', '/v1/notifications?unread=true', { token: ctx.candidate });
    assert.ok(notes.json.items.some((n) => n.kind === 'job_closed' && n.data.jobId === ctx.jobId));
    const dash = await call('GET', '/v1/bff/candidate/dashboard', { token: ctx.candidate });
    assert.equal(dash.json.applications.find((a) => a.id === ctx.appId).job.status, 'closed');

    const read = await call('POST', '/v1/notifications/read-all', { token: ctx.candidate });
    assert.equal(read.status, 204);
    assert.equal((await call('GET', '/v1/notifications?unread=true', { token: ctx.candidate })).json.unreadCount, 0);
  });
});

describe('UC-16 · importación de vacantes', () => {
  it('CSV y JSON con reporte por fila; reimportar actualiza', async () => {
    const csv = `externalId,title,description,seniority,modality,country,city,salaryMin,salaryMax,currency,positions,skills
F-${run}-1,Data Func ${run},"Pipelines de datos.",senior,remote,MX,,4500,5500,USD,1,"Python:4:must;SQL:4"
F-${run}-2,Mala,,mid,remote,MX,,,,USD,1,SQL:3`;
    const send = (format, body, type) =>
      fetch(`${API_URL}/v1/employer/jobs/imports?format=${format}`, { method: 'POST', headers: { authorization: `Bearer ${ctx.employer}`, 'content-type': type }, body })
        .then(async (r) => ({ status: r.status, json: await r.json() }));
    const first = await send('csv', csv, 'text/csv');
    assert.equal(first.status, 200);
    assert.equal(first.json.created, 1);
    assert.equal(first.json.errors[0].row, 2);
    assert.equal((await send('csv', csv, 'text/csv')).json.updated, 1);

    const json = await send('json', JSON.stringify([{ externalId: `F-${run}-3`, title: 'Gerente Func', description: 'Liderazgo de tienda.', seniority: 'lead', location: { country: 'MX', modality: 'onsite' }, positions: 1, skills: ['Liderazgo'] }]), 'application/json');
    assert.equal(json.json.created, 1);
  });
});
