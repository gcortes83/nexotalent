// Utilidades comunes de los hooks de Claude Code (PreToolUse).
// Protocolo: JSON por stdin {tool_name, tool_input, cwd}; exit 2 + stderr = bloquear y explicar al agente.
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';

export async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data ? JSON.parse(data) : {};
}

export function log(projectDir, entry) {
  try {
    appendFileSync(join(projectDir, 'harness-log.jsonl'), JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n');
  } catch {
    /* el log nunca debe romper el hook */
  }
}

/** Ejecuta `decide(input)` → {decision:'allow'|'block', reason}. */
export async function run(hook, decide) {
  const input = await readStdin();
  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
  const result = decide(input, projectDir);
  if (result.decision === 'block') {
    log(projectDir, { hook, tool: input.tool_name, decision: 'block', reason: result.reason });
    process.stderr.write(`[${hook}] Bloqueado: ${result.reason}\n`);
    process.exit(2);
  }
  process.exit(0);
}
