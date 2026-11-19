import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/config.js';

const SECRET = 'x'.repeat(32);

describe('loadEnv', () => {
  it('aplica valores por defecto seguros para desarrollo', () => {
    const env = loadEnv({ JWT_SECRET: SECRET });
    expect(env).toMatchObject({ PORT: 4000, HOST: '0.0.0.0', STORAGE: 'memory', DEMO_AUTH: true, AI_PROVIDER: 'mock' });
  });

  it('convierte PORT y DEMO_AUTH', () => {
    const env = loadEnv({ JWT_SECRET: SECRET, PORT: '8080', DEMO_AUTH: 'false' });
    expect(env.PORT).toBe(8080);
    expect(env.DEMO_AUTH).toBe(false);
  });

  it('rechaza un JWT_SECRET corto', () => {
    expect(() => loadEnv({ JWT_SECRET: 'corto' })).toThrow(/32 caracteres/);
  });

  it('STORAGE=postgres exige DATABASE_URL', () => {
    expect(() => loadEnv({ JWT_SECRET: SECRET, STORAGE: 'postgres' })).toThrow(/DATABASE_URL/);
    expect(loadEnv({ JWT_SECRET: SECRET, STORAGE: 'postgres', DATABASE_URL: 'postgres://x' }).STORAGE).toBe('postgres');
  });

  it('rechaza un proveedor de IA no soportado', () => {
    expect(() => loadEnv({ JWT_SECRET: SECRET, AI_PROVIDER: 'bedrock' })).toThrow();
  });
});
