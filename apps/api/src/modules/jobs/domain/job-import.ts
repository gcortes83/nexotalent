/**
 * Importación de vacantes (docs/04-integraciones.md §2): CSV, JSON (CanonicalJob) y PDF.
 * Funciones puras: convierten cada formato en registros "crudos" que luego valida jobInputSchema
 * (capa de aplicación). La extracción de texto del PDF vive en infra/files.
 */
import type { Modality, Seniority } from '../../matching/domain/types.js';

export type ImportFormat = 'csv' | 'json' | 'pdf';

/** Registro crudo previo a validación. */
export interface RawJobRecord {
  externalId?: string | null;
  title?: string;
  description?: string;
  seniority?: string;
  modality?: string;
  country?: string;
  city?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  positionsTotal?: number;
  urgent?: boolean;
  skills?: { name: string; level: number; mustHave?: boolean }[];
  softSkills?: { name: string; level: number; mustHave?: boolean }[];
}

export const CSV_COLUMNS = [
  'externalId', 'title', 'description', 'seniority', 'modality', 'country', 'city',
  'salaryMin', 'salaryMax', 'currency', 'positions', 'skills', 'urgent', 'softSkills',
] as const;

/** «sí», «si», «true», «1», «urgente», «x» → true. */
export const isTruthyFlag = (v: unknown): boolean =>
  v === true || (typeof v === 'string' && /^(s[ií]|true|1|x|urgente|yes)$/i.test(v.trim()));

export const CSV_TEMPLATE =
  `${CSV_COLUMNS.join(',')}\n` +
  'REQ-001,Backend Engineer Node.js,"APIs con Fastify y PostgreSQL.",senior,remote,MX,,4000,5500,USD,2,"TypeScript:4:must;Node.js:4:must;PostgreSQL:3",sí,"Comunicación:4;Resolución de problemas:3"\n' +
  'REQ-002,Analista de datos,Reportes y tableros.,junior,hybrid,MX,Ciudad de México,1500,2000,USD,1,"SQL:3:must;Power BI:3",no,\n';

export const MAX_IMPORT_ROWS = 500;

/** CSV RFC 4180: comillas, comillas escapadas ("") y saltos de línea dentro de campos. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

/** "TypeScript:4:must;Node.js:3" → skills */
export function parseSkillsCell(cell: string): { name: string; level: number; mustHave: boolean }[] {
  return cell
    .split(/[;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [name = '', level, flag] = s.split(':').map((p) => p.trim());
      return { name, level: Number(level) || 3, mustHave: /^(must|obligatoria|si|sí|true|1)$/i.test(flag ?? '') };
    });
}

const toNum = (v: string | undefined): number | null => {
  const n = Number((v ?? '').replace(/[$\s,]/g, ''));
  return v && v.trim() && Number.isFinite(n) ? n : null;
};

export function csvToRecords(text: string): RawJobRecord[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  const idx = new Map(header.map((h, i) => [h.trim().toLowerCase(), i]));
  const col = (r: string[], name: string) => {
    const i = idx.get(name.toLowerCase());
    return i === undefined ? undefined : r[i]?.trim();
  };
  return rows.map((r) => ({
    externalId: col(r, 'externalId') || null,
    title: col(r, 'title'),
    description: col(r, 'description'),
    seniority: col(r, 'seniority'),
    modality: col(r, 'modality'),
    country: col(r, 'country'),
    city: col(r, 'city') || null,
    salaryMin: toNum(col(r, 'salaryMin')),
    salaryMax: toNum(col(r, 'salaryMax')),
    currency: col(r, 'currency') || undefined,
    positionsTotal: toNum(col(r, 'positions')) ?? undefined,
    skills: parseSkillsCell(col(r, 'skills') ?? ''),
    urgent: isTruthyFlag(col(r, 'urgent') ?? ''),
    softSkills: parseSkillsCell(col(r, 'softSkills') ?? ''),
  }));
}

/** JSON: un CanonicalJob, un arreglo o `{ jobs: [...] }`. */
export function jsonToRecords(input: unknown): RawJobRecord[] {
  const list = Array.isArray(input) ? input : (input as { jobs?: unknown })?.jobs ?? [input];
  return (Array.isArray(list) ? list : []).map((raw) => {
    const j = (raw ?? {}) as Record<string, any>;
    return {
      externalId: j.externalId ?? null,
      title: j.title,
      description: j.description,
      seniority: j.seniority,
      modality: j.location?.modality ?? j.modality,
      country: j.location?.country ?? j.country,
      city: j.location?.city ?? j.city ?? null,
      salaryMin: j.salary?.min ?? j.salaryMin ?? null,
      salaryMax: j.salary?.max ?? j.salaryMax ?? null,
      currency: j.salary?.currency ?? j.currency,
      positionsTotal: j.positions ?? j.positionsTotal,
      urgent: isTruthyFlag(j.urgent ?? j.hot ?? false),
      softSkills: Array.isArray(j.softSkills)
        ? j.softSkills.map((s: any) => (typeof s === 'string' ? { name: s, level: 3 } : { name: s?.name, level: s?.level ?? 3, mustHave: !!s?.mustHave }))
        : [],
      skills: Array.isArray(j.skills)
        ? j.skills.map((s: any) => (typeof s === 'string' ? { name: s, level: 3 } : { name: s?.name, level: s?.level ?? 3, mustHave: !!s?.mustHave }))
        : [],
    };
  });
}

const SENIORITY_ALIASES: Record<string, Seniority> = {
  junior: 'junior', jr: 'junior', trainee: 'junior',
  mid: 'mid', 'semi senior': 'mid', semisenior: 'mid', 'semi-senior': 'mid', intermedio: 'mid', ssr: 'mid',
  senior: 'senior', sr: 'senior',
  lead: 'lead', 'líder': 'lead', lider: 'lead', 'tech lead': 'lead',
};
const MODALITY_ALIASES: Record<string, Modality> = {
  remote: 'remote', remoto: 'remote', 'home office': 'remote',
  hybrid: 'hybrid', 'híbrido': 'hybrid', hibrido: 'hybrid',
  onsite: 'onsite', presencial: 'onsite', 'on-site': 'onsite',
};
export const normalizeSeniority = (v?: string): string | undefined => (v ? SENIORITY_ALIASES[v.trim().toLowerCase()] ?? v : v);
export const normalizeModality = (v?: string): string | undefined => (v ? MODALITY_ALIASES[v.trim().toLowerCase()] ?? v : v);

const JOB_MARKER = /^\s*(vacante|puesto|t[ií]tulo|job title)\s*:\s*(.+)$/i;
const FIELD = /^\s*(nivel|seniority|modalidad|modality|pa[ií]s|country|ciudad|city|salario|salary|posiciones|vacantes|positions|urgente|urgent|id|referencia|external ?id)\s*:\s*(.+)$/i;

/**
 * Texto de PDF → bloques de vacante. Cada vacante empieza con "Vacante:" / "Puesto:" / "Título:".
 * Si no hay marcadores, el documento completo es una vacante y la primera línea es el título.
 * Las skills las propone el extractor de IA en la capa de aplicación (quedan en borrador).
 */
export function splitPdfText(text: string): RawJobRecord[] {
  const lines = text.replace(/\r/g, '').split('\n');
  const blocks: { title: string; body: string[] }[] = [];
  for (const line of lines) {
    const m = line.match(JOB_MARKER);
    if (m) blocks.push({ title: m[2]!.trim(), body: [] });
    else if (blocks.length) blocks.at(-1)!.body.push(line);
  }
  if (!blocks.length) {
    const nonEmpty = lines.map((l) => l.trim()).filter(Boolean);
    if (!nonEmpty.length) return [];
    blocks.push({ title: nonEmpty[0]!, body: nonEmpty.slice(1) });
  }
  return blocks.map(({ title, body }) => {
    // «Vacante: Desarrollador Java (URGENTE)» también marca la vacante como urgente.
    const urgentInTitle = /\burgente\b|🔥/i.test(title);
    const rec: RawJobRecord = { title: title.replace(/\s*[(\[]?\s*(urgente|🔥)\s*[)\]]?\s*/gi, ' ').trim(), skills: [], urgent: urgentInTitle };
    const description: string[] = [];
    for (const line of body) {
      const f = line.match(FIELD);
      if (!f) { description.push(line); continue; }
      const key = f[1]!.toLowerCase();
      const value = f[2]!.trim();
      if (/nivel|seniority/.test(key)) rec.seniority = value;
      else if (/modal/.test(key)) rec.modality = value;
      else if (/pa[ií]s|country/.test(key)) rec.country = value.toUpperCase().slice(0, 2);
      else if (/ciudad|city/.test(key)) rec.city = value;
      else if (/urgent/.test(key)) rec.urgent = isTruthyFlag(value);
      else if (/posiciones|vacantes|positions/.test(key)) rec.positionsTotal = Number(value.match(/\d+/)?.[0] ?? 1);
      else if (/salar/.test(key)) {
        const nums = (value.replace(/[,$]/g, '').match(/\d+(\.\d+)?/g) ?? []).map(Number);
        rec.salaryMin = nums.length > 1 ? nums[0]! : null;
        rec.salaryMax = nums.at(-1) ?? null;
        // Si el PDF indica otra moneda se conserva para que la validación lo reporte (solo se acepta USD).
        rec.currency = value.match(/\b(MXN|USD|COP|EUR)\b/i)?.[1]?.toUpperCase() ?? 'USD';
      } else rec.externalId = value;
    }
    rec.description = description.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    return rec;
  });
}
