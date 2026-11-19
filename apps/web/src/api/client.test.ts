import { describe, expect, it } from 'vitest';
import { fakeApi } from '../test/fake-api';
import { api, ApiError, problemMessage, tokenStore } from './client';

describe('cliente API', () => {
  it('envía el token, correlation id e If-Match al cambiar estatus', async () => {
    tokenStore.set('tkn');
    const { calls } = fakeApi({ 'PATCH /v1/applications/app_1/status': () => ({ body: { id: 'app_1', status: 'in_review', version: 2 } }) });
    await api.changeStatus('app_1', 'in_review', 1);
    expect(calls[0]!.headers.get('Authorization')).toBe('Bearer tkn');
    expect(calls[0]!.headers.get('If-Match')).toBe('"1"');
    expect(calls[0]!.headers.get('X-Correlation-Id')).toMatch(/[0-9a-f-]{36}/);
    expect(calls[0]!.body).toEqual({ status: 'in_review' });
  });

  it('convierte Problem Details en ApiError con mensaje legible', async () => {
    fakeApi({ 'POST /v1/jobs/j/applications': () => ({ status: 409, body: { title: 'Ya te postulaste a esta vacante', status: 409 } }) });
    const err = await api.apply('j').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(problemMessage(err)).toBe('Ya te postulaste a esta vacante');
  });

  it('412 → mensaje de conflicto de versión', () => {
    expect(problemMessage(new ApiError(412, { type: 'x', title: 'version', status: 412 }))).toMatch(/Recarga/);
  });

  it('401 borra el token guardado', async () => {
    tokenStore.set('viejo');
    fakeApi({ 'GET /v1/me': () => ({ status: 401, body: { title: 'Autenticación requerida', status: 401 } }) });
    await expect(api.me()).rejects.toBeInstanceOf(ApiError);
    expect(tokenStore.get()).toBeNull();
  });

  it('error de red → mensaje genérico', () => {
    expect(problemMessage(new TypeError('fetch failed'))).toMatch(/red/);
  });
});
