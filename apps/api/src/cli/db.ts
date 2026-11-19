/**
 * CLI de base de datos, compilado a dist/cli/db.js para usarlo también dentro de la imagen Docker.
 *   node dist/cli/db.js migrate        → aplica migraciones pendientes
 *   node dist/cli/db.js seed           → recarga los datos sintéticos (borra y recrea)
 *   node dist/cli/db.js migrate seed   → ambos
 * En desarrollo: npm run db:migrate / npm run db:seed (vía tsx).
 */
import { fileURLToPath } from 'node:url';
import { migrate } from '../infra/db/migrate.js';
import { seedDatabase } from '../infra/db/seed.js';
import { buildSeed } from '../seed/seed-data.js';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations', import.meta.url));

export async function runDbCommands(commands: string[], url: string | undefined): Promise<void> {
  if (!url) throw new Error('DATABASE_URL es obligatoria');
  if (!commands.length) throw new Error('Uso: db.js <migrate|seed> [...]');
  for (const cmd of commands) {
    if (cmd === 'migrate') {
      await migrate(url, MIGRATIONS_DIR);
    } else if (cmd === 'seed') {
      if (/prod/i.test(url)) throw new Error('Seed bloqueado: la URL parece de producción');
      await seedDatabase(url, buildSeed(new Date()));
      console.log('✔ Datos sintéticos cargados (cuentas: candidata@example.com, reclutador@example.com…)');
    } else {
      throw new Error(`Comando desconocido: ${cmd}`);
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runDbCommands(process.argv.slice(2), process.env.DATABASE_URL).catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
