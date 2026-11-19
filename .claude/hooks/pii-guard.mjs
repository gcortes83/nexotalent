#!/usr/bin/env node
// PreToolUse(Edit|Write): impide escribir datos personales reales en código, tests, seeds y fixtures.
import { pathToFileURL } from 'node:url';
import { run } from './lib.mjs';

const EMAIL = /[\w.+-]+@([\w-]+\.)+[a-z]{2,}/gi;
const ALLOWED_EMAIL_DOMAINS = /@(example\.(com|org|net)|anthropic\.com|users\.noreply\.github\.com)$/i;
const CURP = /\b[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d\b/;
const RFC = /\b[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}\b/;
const MX_PHONE = /(\+?52[\s-]?)?(\(?\d{2,3}\)?[\s-]?)\d{3,4}[\s-]?\d{4}\b/;
const CARD = /\b(?:4\d{3}|5[1-5]\d{2})(?:[\s-]?\d{4}){3}\b/;
const CODE_FILE = /\.(ts|tsx|js|mjs|json|sql|csv|ya?ml|md)$/;

export function decide(input) {
  const ti = input?.tool_input ?? {};
  const file = ti.file_path ?? '';
  if (!CODE_FILE.test(file)) return { decision: 'allow' };
  const text = [ti.content, ti.new_string, ...(ti.edits ?? []).map((e) => e.new_string)].filter(Boolean).join('\n');

  const badEmail = (text.match(EMAIL) ?? []).find((e) => !ALLOWED_EMAIL_DOMAINS.test(e));
  if (badEmail) return { decision: 'block', reason: `email real (${badEmail}); usa el dominio example.com` };
  if (CURP.test(text)) return { decision: 'block', reason: 'CURP con formato válido; usa datos sintéticos' };
  if (RFC.test(text)) return { decision: 'block', reason: 'RFC con formato válido; usa datos sintéticos' };
  if (CARD.test(text) && !/4242[\s-]?4242[\s-]?4242[\s-]?4242/.test(text)) {
    return { decision: 'block', reason: 'número de tarjeta; usa solo tarjetas de prueba de Stripe' };
  }
  if (/(test|seed|fixture)/i.test(file) && MX_PHONE.test(text)) return { decision: 'block', reason: 'teléfono en fixtures; usa 555-000-0000' };
  return { decision: 'allow' };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) run('pii-guard', decide);
