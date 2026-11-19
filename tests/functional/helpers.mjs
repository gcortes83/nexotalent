// Utilidades de las pruebas funcionales "en vivo": se ejecutan contra la app levantada
// (make start → API :4000 + web :5173, o make docker-up → API :4000 + web :8080).
import assert from 'node:assert/strict';

export const API_URL = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
export const WEB_URL = (process.env.WEB_URL ?? 'http://localhost:5173').replace(/\/$/, '');

export const ACCOUNTS = {
  ana: 'candidata@example.com',
  luis: 'candidato@example.com',
  sofia: 'nueva@example.com',
  fintech: 'reclutador@example.com',
  retail: 'reclutadora@example.com',
};


/** fetch con JSON, token y headers; nunca lanza por status HTTP. */
export async function call(method, path, { token, body, headers = {}, base = API_URL } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  return { status: res.status, headers: res.headers, json, text };
}

export async function login(email) {
  const r = await call('POST', '/v1/auth/demo-login', { body: { email } });
  assert.equal(r.status, 200, `login ${email}: ${r.text}`);
  return r.json.token;
}

/** Falla rápido y con instrucciones si la app no está levantada. */
export async function requireUp(base, what) {
  try {
    const r = await fetch(`${base}/health`, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) throw new Error(`status ${r.status}`);
  } catch (err) {
    throw new Error(
      `${what} no responde en ${base} (${err.message}). Levanta la app con "make start" (local) o "make docker-up" (Docker); ` +
        'si usas Docker exporta WEB_URL=http://localhost:8080.',
    );
  }
}

export function assertProblem(r, status) {
  assert.equal(r.status, status, r.text);
  assert.match(r.headers.get('content-type') ?? '', /application\/problem\+json/);
  assert.equal(r.json.status, status);
  assert.ok(r.json.title, 'problem.title');
}
