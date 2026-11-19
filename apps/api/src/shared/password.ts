import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/** Hash de contraseña con scrypt (N=2^14, r=8, p=1). Formato: `scrypt$<salt b64>$<hash b64>`. */
const KEYLEN = 32;
const PARAMS = { N: 16384, r: 8, p: 1 } as const;

export function hashPassword(plain: string, salt: Buffer = randomBytes(16)): string {
  const hash = scryptSync(plain.normalize('NFKC'), salt, KEYLEN, PARAMS);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  const [scheme, saltB64, hashB64] = (stored ?? '').split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = scryptSync(plain.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, PARAMS);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Política mínima: 8+ caracteres con al menos una letra y un número. */
export const PASSWORD_RULE = /^(?=.*[A-Za-zÀ-ÿ])(?=.*\d).{8,128}$/;
