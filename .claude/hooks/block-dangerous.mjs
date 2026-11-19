#!/usr/bin/env node
// PreToolUse(Bash): bloquea comandos destructivos o con efectos fuera del entorno local.
import { pathToFileURL } from 'node:url';
import { run } from './lib.mjs';

export const RULES = [
  [/\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\b/i, 'rm -rf está prohibido; borra archivos concretos'],
  [/\bgit\s+push\b.*(--force|-f\b)/, 'git push --force reescribe historia compartida'],
  [/\bgit\s+reset\s+--hard\b/, 'git reset --hard descarta trabajo; usa git stash'],
  [/\bgit\s+push\b.*\b(main|master)\b/, 'push directo a main; abre un PR'],
  [/\bcdk\s+destroy\b/, 'cdk destroy elimina infraestructura'],
  [/\bcdk\s+deploy\b/, 'el despliegue lo hace el pipeline o una persona, no el agente'],
  [/\baws\s+\S+\s+(delete|remove|terminate|purge)[\w-]*/i, 'operación destructiva en AWS'],
  [/--profile\s+\S*prod/i, 'acceso a perfiles de producción'],
  [/\b(curl|wget)\b[^|]*\|\s*(ba|z)?sh\b/, 'ejecutar scripts remotos (curl | sh)'],
  [/\bnpm\s+publish\b/, 'publicar paquetes'],
  [/\b(drop\s+(table|schema|database)|truncate\s+table)\b/i, 'SQL destructivo; usa migraciones expand/contract'],
  [/\b(cat|less|more|head|tail|grep)\b[^|;]*\.env(?!\.example)\b/, 'leer archivos .env'],
];

export function decide(input) {
  const cmd = input?.tool_input?.command ?? '';
  for (const [re, reason] of RULES) if (re.test(cmd)) return { decision: 'block', reason };
  return { decision: 'allow' };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) run('block-dangerous', decide);
