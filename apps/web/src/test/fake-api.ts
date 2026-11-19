import { vi } from 'vitest';

type Handler = (req: { method: string; url: string; body: unknown; headers: Headers }) => { status?: number; body?: unknown; headers?: Record<string, string> };

/** Mock de fetch por ruta: `"GET /v1/jobs": () => ({ body: … })`. Registra las llamadas. */
export function fakeApi(routes: Record<string, Handler>) {
  const calls: { method: string; url: string; body: unknown; headers: Headers }[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input).replace(/^https?:\/\/[^/]+/, '');
    const method = (init.method ?? 'GET').toUpperCase();
    // Cuerpo JSON → objeto; archivos (File/Blob) se pasan tal cual.
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body ?? undefined;
    const headers = new Headers(init.headers);
    calls.push({ method, url, body, headers });
    const path = url.split('?')[0];
    const handler = routes[`${method} ${url}`] ?? routes[`${method} ${path}`];
    if (!handler) return new Response(JSON.stringify({ title: `Sin mock: ${method} ${url}`, status: 404 }), { status: 404 });
    const r = handler({ method, url, body, headers });
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), {
      status: r.status ?? 200,
      headers: { 'Content-Type': 'application/json', ...r.headers },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}
