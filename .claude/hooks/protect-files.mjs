#!/usr/bin/env node
// PreToolUse(Edit|Write|MultiEdit): protege secretos, migraciones aplicadas y archivos fuera del repo.
import { existsSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { run } from './lib.mjs';

export function decide(input, projectDir) {
  const file = input?.tool_input?.file_path;
  if (!file) return { decision: 'allow' };
  const abs = isAbsolute(file) ? file : resolve(projectDir, file);
  const rel = relative(projectDir, abs);

  if (rel.startsWith('..') || isAbsolute(rel)) return { decision: 'block', reason: `${file} está fuera del repo` };
  if (/(^|\/)\.env(?!\.example$)(\..*)?$/.test(rel)) return { decision: 'block', reason: 'no se editan archivos .env' };
  if (/(^|\/)(secrets?|\.aws)\//.test(rel) || /\.(pem|key)$/.test(rel)) return { decision: 'block', reason: 'archivo de secretos' };
  if (/^apps\/api\/migrations\/.+\.sql$/.test(rel) && existsSync(abs)) {
    return { decision: 'block', reason: 'las migraciones aplicadas son inmutables; crea una nueva (expand/contract)' };
  }
  if (/(^|\/)package-lock\.json$/.test(rel)) return { decision: 'block', reason: 'package-lock.json se actualiza con npm, no a mano' };
  return { decision: 'allow' };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) run('protect-files', decide);
