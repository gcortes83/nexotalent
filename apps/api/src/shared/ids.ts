import { randomBytes } from 'node:crypto';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** ULID (26 caracteres, ordenable por tiempo) con prefijo de tipo: `app_01J…`. */
export function newId(prefix: string, now = Date.now()): string {
  let time = '';
  let t = now;
  for (let i = 0; i < 10; i++) {
    time = CROCKFORD[t % 32] + time;
    t = Math.floor(t / 32);
  }
  const rand = [...randomBytes(16)].slice(0, 16).map((b) => CROCKFORD[b % 32]).join('');
  return `${prefix}_${time}${rand}`;
}
