/**
 * Pruebas funcionales en vivo del frontend servido (Vite en :5173 o nginx en Docker :8080):
 * entrega de la SPA, rutas profundas y proxy same-origin hacia la API.
 */
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { ACCOUNTS, call, requireUp, WEB_URL } from './helpers.mjs';

before(() => requireUp(WEB_URL, 'El frontend (proxy /health)'));

describe('WEB-01 · entrega de la SPA', () => {
  it('GET / devuelve el index.html con el contenedor de React', async () => {
    const r = await call('GET', '/', { base: WEB_URL });
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type') ?? '', /text\/html/);
    assert.match(r.text, /<div id="root">/);
  });

  for (const path of ['/login', '/jobs', '/jobs/job_backend_node', '/c/dashboard', '/c/profile', '/e/dashboard', '/e/jobs/job_backend_node']) {
    it(`ruta profunda ${path} → index.html (fallback de la SPA)`, async () => {
      const r = await call('GET', path, { base: WEB_URL });
      assert.equal(r.status, 200);
      assert.match(r.text, /<div id="root">/);
    });
  }
});

describe('WEB-02 · proxy same-origin /v1 → API (sin CORS)', () => {
  it('GET /v1/jobs a través del frontend devuelve JSON de la API', async () => {
    const r = await call('GET', '/v1/jobs', { base: WEB_URL });
    assert.equal(r.status, 200);
    assert.ok(r.json.items.length >= 8);
  });

  it('login de demo y GET /v1/me a través del frontend', async () => {
    const login = await call('POST', '/v1/auth/demo-login', { base: WEB_URL, body: { email: ACCOUNTS.ana } });
    assert.equal(login.status, 200);
    const me = await call('GET', '/v1/me', { base: WEB_URL, token: login.json.token });
    assert.equal(me.json.email, ACCOUNTS.ana);
  });

  it('los errores conservan Problem Details', async () => {
    const r = await call('GET', '/v1/jobs/job_draft', { base: WEB_URL });
    assert.equal(r.status, 404);
    assert.match(r.headers.get('content-type') ?? '', /application\/problem\+json/);
  });
});
