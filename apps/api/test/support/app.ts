import { createLogEmailSender } from '../../src/infra/email/email-senders.js';
import { buildApp } from '../../src/infra/http/app.js';
import { createMemoryDeps } from '../../src/infra/memory/memory-adapters.js';
import { buildSeed } from '../../src/seed/seed-data.js';
import { fixedClock } from '../../src/shared/clock.js';

export const NOW = '2026-11-17T12:00:00.000Z';

export async function testApp() {
  const clock = fixedClock(NOW);
  const email = createLogEmailSender();
  const deps = createMemoryDeps(buildSeed(clock.now()), clock, email);
  const app = await buildApp(deps, {
    jwtSecret: 'test-secret-test-secret-test-secret-123',
    demoAuth: true,
    corsOrigins: ['http://localhost:5173'],
    outbox: email.outbox,
  });
  const login = async (email: string) => {
    const res = await app.inject({ method: 'POST', url: '/v1/auth/demo-login', payload: { email } });
    return { authorization: `Bearer ${res.json().token as string}` };
  };
  return { app, deps, clock, login, outbox: email.outbox };
}

/** Offset de 10 dígitos para la tabla xref del PDF. */
const pad10 = (n: number) => String(n).padStart(10, '0');

/** PDF mínimo válido (una página por bloque de líneas) para probar la extracción sin binarios en el repo. */
export function tinyPdf(pages: string[][]): Buffer {
  const objs: string[] = [];
  const pageIds = pages.map((_, i) => 4 + i * 2);
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  pages.forEach((lines, i) => {
    const esc = (t: string) => t.replace(/[\\()]/g, (c) => `\\${c}`);
    const stream = `BT /F1 11 Tf 14 TL 50 780 Td ${lines.map((l) => `(${esc(l)}) Tj T*`).join(' ')} ET`;
    const id = pageIds[i]!;
    objs[id] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${id + 1} 0 R >>`;
    objs[id + 1] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`;
  });
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let id = 1; id < objs.length; id++) {
    offsets[id] = Buffer.byteLength(out, 'latin1');
    out += `${id} 0 obj\n${objs[id]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objs.length}\n${pad10(0)} ${2 ** 16 - 1} f \n`;
  for (let id = 1; id < objs.length; id++) out += `${pad10(offsets[id]!)} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}
