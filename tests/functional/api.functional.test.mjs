/**
 * Pruebas funcionales en vivo de la API: recorren TODOS los casos de uso del núcleo MVP contra
 * la aplicación en ejecución (memoria o PostgreSQL). No usan mocks.
 *
 *   make test-functional                    (API_URL=http://localhost:4000 por defecto)
 *
 * Son re-ejecutables: cada corrida usa una vacante a la que Sofía aún no se ha postulado.
 * Tras ~8 corridas contra PostgreSQL se agotan; recarga los datos con `make db-seed`
 * (en modo memoria basta reiniciar la API).
 */
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { ACCOUNTS, API_URL, assertProblem, call, login, requireUp } from './helpers.mjs';

/** Reclutadores de las empresas adicionales del seed. */
const EXTRA_RECRUITERS = ['salud@example.com', 'logistica@example.com', 'edtech@example.com', 'banca@example.com', 'agro@example.com', 'turismo@example.com'];

const CV = `Sofía Demo — Desarrolladora full-stack.
Experiencia avanzada en TypeScript, JavaScript y Node.js construyendo APIs con Fastify.
Uso diario de React, PostgreSQL y Docker; nociones de AWS y Python. Inglés intermedio. Git y TDD con Vitest.
Trabajo en equipo y comunicación con clientes de e-commerce.`;

const tokens = {};
before(async () => {
  await requireUp(API_URL, 'La API');
  for (const [k, email] of Object.entries(ACCOUNTS)) tokens[k] = await login(email);
});

describe('UC-00 · salud y trazabilidad', () => {
  it('GET /health responde ok y propaga X-Correlation-Id', async () => {
    const r = await call('GET', '/health', { headers: { 'x-correlation-id': 'func-test-123' } });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json, { status: 'ok' });
    assert.equal(r.headers.get('x-correlation-id'), 'func-test-123');
  });
});

describe('UC-01 · autenticación de demo (simula Cognito)', () => {
  it('login de demo devuelve token y usuario con rol', async () => {
    const r = await call('POST', '/v1/auth/demo-login', { body: { email: ACCOUNTS.fintech } });
    assert.equal(r.status, 200);
    assert.ok(r.json.token.split('.').length === 3, 'JWT');
    assert.equal(r.json.user.role, 'recruiter');
    assert.equal(r.json.user.organizationId, 'org_fintech');
  });

  it('usuario inexistente → 404 y email inválido → 4xx (Problem Details)', async () => {
    assertProblem(await call('POST', '/v1/auth/demo-login', { body: { email: 'nadie@example.com' } }), 404);
    const bad = await call('POST', '/v1/auth/demo-login', { body: { email: 'no-es-email' } });
    assert.ok(bad.status >= 400 && bad.status < 500, bad.text);
  });

  it('GET /v1/me exige token (401) y con token devuelve al usuario', async () => {
    assertProblem(await call('GET', '/v1/me'), 401);
    assertProblem(await call('GET', '/v1/me', { token: 'token.invalido.x' }), 401);
    const me = await call('GET', '/v1/me', { token: tokens.ana });
    assert.equal(me.status, 200);
    assert.equal(me.json.email, ACCOUNTS.ana);
  });
});

describe('UC-02 · catálogo de vacantes y skills (público)', () => {
  it('lista solo vacantes publicadas', async () => {
    const r = await call('GET', '/v1/jobs');
    assert.equal(r.status, 200);
    assert.ok(r.json.total >= 100);
    assert.ok(r.json.items.length >= 8);
    assert.ok(r.json.items.every((j) => j.status === 'published'));
    assert.ok(!r.json.items.some((j) => j.id === 'job_draft'));
  });

  it('busca por skill o título', async () => {
    const r = await call('GET', '/v1/jobs?q=python');
    assert.equal(r.status, 200);
    assert.ok(r.json.items.some((j) => j.id === 'job_data_scientist'));
    assert.deepEqual((await call('GET', '/v1/jobs?q=cobol-inexistente')).json.items, []);
  });

  it('detalle con skills requeridas; borrador o inexistente → 404', async () => {
    const r = await call('GET', '/v1/jobs/job_backend_node');
    assert.equal(r.status, 200);
    assert.equal(r.json.title, 'Backend Engineer Node.js');
    assert.ok(r.json.skills.some((s) => s.mustHave));
    assertProblem(await call('GET', '/v1/jobs/job_draft'), 404);
    assertProblem(await call('GET', '/v1/jobs/job_no_existe'), 404);
  });

  it('taxonomía de skills', async () => {
    const r = await call('GET', '/v1/skills');
    assert.equal(r.status, 200);
    assert.ok(r.json.length >= 30);
  });
});

describe('UC-03 · match explicable con radar (HU-01)', () => {
  it('Ana ve score, factores, radar ≤ 8 ejes, fortalezas y brechas', async () => {
    const r = await call('GET', '/v1/jobs/job_backend_node/match', { token: tokens.ana });
    assert.equal(r.status, 200);
    assert.ok(r.json.score > 0 && r.json.score <= 1);
    assert.equal(r.json.scorePercent, Math.round(r.json.score * 100));
    assert.equal(r.json.modelVersion, 'match-v1');
    assert.ok(r.json.radar.length >= 1 && r.json.radar.length <= 8);
    for (const k of ['skillCoverage', 'semanticSimilarity', 'seniorityFit', 'preferenceFit', 'mustHavePenalty']) {
      assert.equal(typeof r.json.factors[k], 'number', k);
    }
    assert.ok(Array.isArray(r.json.strengths) && Array.isArray(r.json.gaps));
    assert.match(r.json.explanation, /Cumples \d+ de \d+ skills/);
  });

  it('ETag + If-None-Match → 304', async () => {
    const first = await call('GET', '/v1/jobs/job_backend_node/match', { token: tokens.ana });
    const etag = first.headers.get('etag');
    assert.ok(etag);
    const second = await call('GET', '/v1/jobs/job_backend_node/match', { token: tokens.ana, headers: { 'if-none-match': etag } });
    assert.equal(second.status, 304);
  });

  it('solo candidatos piden match (reclutador → 403); vacante en borrador → 404', async () => {
    assertProblem(await call('GET', '/v1/jobs/job_backend_node/match', { token: tokens.fintech }), 403);
    assertProblem(await call('GET', '/v1/jobs/job_draft/match', { token: tokens.ana }), 404);
  });
});

describe('UC-04..UC-08 · flujo completo: CV → skills → match → postular → pipeline → retirar', () => {
  let target; // vacante elegida para esta corrida
  let application;
  let recruiter; // token del reclutador dueño de la vacante
  let outsider; // token del reclutador de la otra organización

  it('UC-04 · perfil propio de la candidata (sin datos sensibles)', async () => {
    const r = await call('GET', '/v1/candidates/me', { token: tokens.sofia });
    assert.equal(r.status, 200);
    assert.equal(r.json.fullName.startsWith('Sofía'), true);
    assert.equal('embedding' in r.json, false);
    assert.equal('resumeText' in r.json, false);
    assertProblem(await call('GET', '/v1/candidates/me', { token: tokens.fintech }), 403);
  });

  it('UC-05 · subir CV: la IA propone skills SIN confirmar y el match no cambia', async () => {
    const before = await call('GET', '/v1/jobs/job_backend_node/match', { token: tokens.sofia });
    assert.ok([400, 422].includes((await call('POST', '/v1/candidates/me/resume', { token: tokens.sofia, body: { text: 'corto' } })).status));

    const r = await call('POST', '/v1/candidates/me/resume', { token: tokens.sofia, body: { text: CV } });
    assert.equal(r.status, 200, r.text);
    assert.ok(r.json.proposedSkills.every((s) => s.confirmed === false));
    const known = [...r.json.proposedSkills, ...r.json.confirmedSkills].map((s) => s.name);
    for (const name of ['TypeScript', 'Node.js', 'PostgreSQL']) assert.ok(known.includes(name), `${name} extraída`);

    const after = await call('GET', '/v1/jobs/job_backend_node/match', { token: tokens.sofia });
    assert.equal(after.json.score, before.json.score, 'las propuestas no confirmadas no cuentan');
  });

  it('UC-06 · confirmar skills recalcula el match e invalida el ETag', async () => {
    const before = await call('GET', '/v1/jobs/job_backend_node/match', { token: tokens.sofia });
    const profile = (await call('GET', '/v1/candidates/me', { token: tokens.sofia })).json;
    const byId = new Map(profile.skills.map((s) => [s.skillId, s.level]));
    const skills = [...byId].map(([skillId, level]) => ({ skillId, level }));

    const bad = await call('PUT', '/v1/candidates/me/skills', { token: tokens.sofia, body: { skills: [{ skillId: 'sk_cobol', level: 3 }] } });
    assert.ok([400, 422].includes(bad.status), bad.text);

    const r = await call('PUT', '/v1/candidates/me/skills', { token: tokens.sofia, body: { skills } });
    assert.equal(r.status, 200, r.text);
    assert.ok(r.json.confirmedSkills.every((s) => s.confirmed));

    const after = await call('GET', '/v1/jobs/job_backend_node/match', {
      token: tokens.sofia,
      headers: { 'if-none-match': before.headers.get('etag') },
    });
    assert.equal(after.status, 200, 'el ETag anterior ya no es válido');
    assert.ok(after.json.score > 0.3, `score ${after.json.score}`);
  });

  it('UC-07 · postular a una vacante nueva (201 + ETag) y no duplicar (409)', async (t) => {
    const dash = (await call('GET', '/v1/bff/candidate/dashboard', { token: tokens.sofia })).json;
    const applied = new Set(dash.applications.map((a) => a.jobId ?? a.job?.id));
    const jobs = (await call('GET', '/v1/jobs')).json.items;
    target = jobs.find((j) => !applied.has(j.id));
    if (!target) {
      t.skip('Sofía ya se postuló a todas las vacantes: ejecuta `make db-seed` (o reinicia la API en modo memoria)');
      return;
    }
    // La vista pública no expone la organización: el reclutador correcto es el que puede listar la vacante.
    const ownsJob = async (token) => (await call('GET', `/v1/jobs/${target.id}/applications`, { token })).status === 200;
    const recruiters = [tokens.fintech, tokens.retail, ...(await Promise.all(EXTRA_RECRUITERS.map(login)))];
    for (const t of recruiters) if (!recruiter && (await ownsJob(t))) recruiter = t;
    assert.ok(recruiter, 'algún reclutador de demo es dueño de la vacante');
    outsider = recruiters.find((t) => t !== recruiter);

    const r = await call('POST', `/v1/jobs/${target.id}/applications`, { token: tokens.sofia });
    assert.equal(r.status, 201, r.text);
    assert.equal(r.json.status, 'submitted');
    assert.equal(r.json.version, 1);
    assert.equal(r.headers.get('etag'), '"1"');
    application = r.json;

    assertProblem(await call('POST', `/v1/jobs/${target.id}/applications`, { token: tokens.sofia }), 409);
    assertProblem(await call('POST', `/v1/jobs/${target.id}/applications`, { token: tokens.fintech }), 403);
  });

  it('UC-07 · el dashboard de la candidata muestra el stepper en "submitted"', async (t) => {
    if (!application) return t.skip('sin postulación nueva');
    const dash = (await call('GET', '/v1/bff/candidate/dashboard', { token: tokens.sofia })).json;
    const mine = dash.applications.find((a) => a.id === application.id);
    assert.ok(mine, 'postulación visible');
    assert.equal(mine.stepper.current, 'submitted');
    assert.ok(!dash.recommendedJobs.some((j) => j.id === target.id), 'no se recomienda una vacante ya postulada');
    assert.ok(dash.summary.active >= 1);
  });

  it('UC-08 · el reclutador ve a la candidata ordenada por match; otra organización recibe 404', async (t) => {
    if (!application) return t.skip('sin postulación nueva');
    const list = await call('GET', `/v1/jobs/${target.id}/applications`, { token: recruiter });
    assert.equal(list.status, 200, list.text);
    const scores = list.json.items.map((a) => a.matchScore ?? 0);
    assert.deepEqual(scores, [...scores].sort((a, b) => b - a), 'orden descendente por match');
    assert.ok(list.json.items.some((a) => a.id === application.id));

    assertProblem(await call('GET', `/v1/jobs/${target.id}/applications`, { token: outsider }), 404);
    assertProblem(
      await call('PATCH', `/v1/applications/${application.id}/status`, {
        token: outsider,
        body: { status: 'in_review' },
        headers: { 'if-match': '"1"' },
      }),
      404,
    );
    assertProblem(await call('GET', `/v1/jobs/${target.id}/applications`, { token: tokens.ana }), 403);
  });

  it('UC-08 · cambio de estatus: If-Match obligatorio (428), versión vieja (412), transición inválida (409)', async (t) => {
    if (!application) return t.skip('sin postulación nueva');
    const url = `/v1/applications/${application.id}/status`;
    assertProblem(await call('PATCH', url, { token: recruiter, body: { status: 'in_review' } }), 428);
    assertProblem(await call('PATCH', url, { token: recruiter, body: { status: 'in_review' }, headers: { 'if-match': '"99"' } }), 412);
    assertProblem(await call('PATCH', url, { token: recruiter, body: { status: 'offer' }, headers: { 'if-match': '"1"' } }), 409);
    assertProblem(await call('PATCH', url, { token: tokens.sofia, body: { status: 'in_review' }, headers: { 'if-match': '"1"' } }), 403);
    const bogus = await call('PATCH', url, { token: recruiter, body: { status: 'withdrawn' }, headers: { 'if-match': '"1"' } });
    assert.ok([400, 422].includes(bogus.status), 'el reclutador no puede marcar "withdrawn"');
  });

  it('UC-08 · el reclutador avanza el pipeline hasta "offer" y el stepper de la candidata lo refleja', async (t) => {
    if (!application) return t.skip('sin postulación nueva');
    let version = 1;
    for (const status of ['in_review', 'shortlisted', 'interview_scheduled', 'interview_done', 'offer']) {
      const r = await call('PATCH', `/v1/applications/${application.id}/status`, {
        token: recruiter,
        body: { status, reason: `prueba funcional → ${status}` },
        headers: { 'if-match': `"${version}"` },
      });
      assert.equal(r.status, 200, `${status}: ${r.text}`);
      assert.equal(r.json.status, status);
      assert.equal(r.json.version, version + 1);
      assert.equal(r.headers.get('etag'), `"${version + 1}"`);
      version = r.json.version;
    }
    application.version = version;
    const dash = (await call('GET', '/v1/bff/candidate/dashboard', { token: tokens.sofia })).json;
    assert.equal(dash.applications.find((a) => a.id === application.id).stepper.current, 'offer');
  });

  it('UC-09 · la candidata retira su postulación; queda terminal (409 para todos)', async (t) => {
    if (!application) return t.skip('sin postulación nueva');
    assertProblem(await call('POST', `/v1/applications/${application.id}/withdraw`, { token: tokens.ana }), 404);

    const r = await call('POST', `/v1/applications/${application.id}/withdraw`, { token: tokens.sofia });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.status, 'withdrawn');

    assertProblem(await call('POST', `/v1/applications/${application.id}/withdraw`, { token: tokens.sofia }), 409);
    assertProblem(
      await call('PATCH', `/v1/applications/${application.id}/status`, {
        token: recruiter,
        body: { status: 'in_review' },
        headers: { 'if-match': `"${r.json.version}"` },
      }),
      409,
    );
  });
});

describe('UC-10 · dashboards del empleador y postulaciones estancadas (3/5 días)', () => {
  it('cada reclutador ve solo vacantes de su organización con pipeline', async () => {
    for (const [token, prefix] of [[tokens.fintech, 'org_fintech'], [tokens.retail, 'org_retail']]) {
      const r = await call('GET', '/v1/bff/employer/dashboard', { token });
      assert.equal(r.status, 200);
      assert.ok(r.json.jobs.length >= 1);
      for (const j of r.json.jobs) assert.equal(typeof j.pipeline.submitted, 'number');
      const me = (await call('GET', '/v1/me', { token })).json;
      assert.equal(me.organizationId, prefix);
    }
    const fintechIds = (await call('GET', '/v1/bff/employer/dashboard', { token: tokens.fintech })).json.jobs.map((j) => j.id);
    assert.ok(!fintechIds.includes('job_java_retail'));
  });

  it('marca estancadas: ≥ 3 días warning, ≥ 5 días escalated', async () => {
    const r = await call('GET', '/v1/bff/employer/dashboard', { token: tokens.retail });
    for (const s of r.json.staleApplications) {
      assert.ok(s.staleDays >= 3);
      assert.equal(s.level, s.staleDays >= 5 ? 'escalated' : 'warning');
    }
    const luis = r.json.staleApplications.find((s) => s.applicationId === 'app_luis_java');
    if (luis) assert.equal(luis.level, 'escalated');
  });

  it('candidatos no acceden al dashboard del empleador (403)', async () => {
    assertProblem(await call('GET', '/v1/bff/employer/dashboard', { token: tokens.ana }), 403);
  });
});
