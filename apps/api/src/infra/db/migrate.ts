import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import postgres from 'postgres';

/**
 * Runner mínimo de migraciones SQL (expand-only). Cada archivo se aplica una sola vez en una
 * transacción y queda registrado en public.schema_migrations. Nunca edites una migración aplicada:
 * crea una nueva.
 */
export async function migrate(databaseUrl: string, dir: string, log = console.log): Promise<string[]> {
  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    await sql`CREATE TABLE IF NOT EXISTS public.schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
    const applied = new Set((await sql`SELECT name FROM public.schema_migrations`).map((r) => r.name as string));
    const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
    const done: string[] = [];
    for (const f of files.filter((f) => !applied.has(f))) {
      const body = await readFile(join(dir, f), 'utf8');
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`INSERT INTO public.schema_migrations (name) VALUES (${f})`;
      });
      log(`✔ migración aplicada: ${f}`);
      done.push(f);
    }
    if (!done.length) log('Sin migraciones pendientes');
    return done;
  } finally {
    await sql.end();
  }
}
