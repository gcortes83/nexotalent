/**
 * Importación de 1..N vacantes (CSV, JSON CanonicalJob o texto de PDF).
 * Validación por registro con reporte de errores; upsert por (organización, externalId).
 * CSV/JSON quedan en borrador salvo `publish`; PDF siempre en borrador (needs review).
 */
import type { Deps } from '../../../ports.js';
import { ForbiddenError, ValidationError } from '../../../shared/errors.js';
import { isEmployer, type User } from '../../identity/domain/user.js';
import { csvToRecords, type ImportFormat, jsonToRecords, MAX_IMPORT_ROWS, type RawJobRecord, splitPdfText } from '../domain/job-import.js';
import { EDITABLE_STATUSES } from '../domain/job.js';
import { buildJob, jobInputSchema } from './manage-jobs.js';

export interface ImportReport {
  format: ImportFormat;
  created: number;
  updated: number;
  items: { row: number; jobId: string; title: string; result: 'created' | 'updated'; status: string; warnings: string[] }[];
  errors: { row: number; message: string }[];
}

export async function importJobs(
  deps: Deps,
  user: User,
  input: { format: ImportFormat; content: string | unknown; publish: boolean },
): Promise<ImportReport> {
  if (!isEmployer(user) || !user.organizationId) throw new ForbiddenError();
  const org = user.organizationId;
  let records: RawJobRecord[];
  if (input.format === 'csv') records = csvToRecords(String(input.content));
  else if (input.format === 'json') records = jsonToRecords(input.content);
  else records = await withExtractedSkills(deps, splitPdfText(String(input.content)));

  if (!records.length) throw new ValidationError('El archivo no contiene vacantes');
  if (records.length > MAX_IMPORT_ROWS) throw new ValidationError(`Máximo ${MAX_IMPORT_ROWS} vacantes por archivo`);

  const publish = input.publish && input.format !== 'pdf';
  const report: ImportReport = { format: input.format, created: 0, updated: 0, items: [], errors: [] };

  for (const [i, raw] of records.entries()) {
    const row = i + 1;
    // PDF: los campos que el texto no trae toman valores por defecto (la vacante queda en borrador para revisión).
    const defaults = input.format === 'pdf' ? { seniority: 'mid', modality: 'remote' } : {};
    const parsed = jobInputSchema.safeParse({ positionsTotal: 1, country: 'MX', ...defaults, ...stripUndefined(raw) });
    if (!parsed.success) {
      report.errors.push({ row, message: parsed.error.issues.map((x) => `${x.path.join('.') || 'registro'}: ${x.message}`).join('; ') });
      continue;
    }
    const existing = parsed.data.externalId
      ? await deps.jobs.findByExternalId(org, parsed.data.externalId)
      : null;
    if (existing && !EDITABLE_STATUSES.includes(existing.status)) {
      report.errors.push({ row, message: `La vacante ${parsed.data.externalId} está ${existing.status} y no se puede actualizar` });
      continue;
    }
    const { job, unknownSkills } = await buildJob(deps, user, parsed.data, {
      existing: existing ?? undefined,
      source: input.format,
      publish: publish && parsed.data.skills.length > 0,
      strictSkills: false,
    });
    if (!job.skills.length && job.status === 'published') job.status = 'draft';
    await deps.jobs.save(job);
    if (existing) await deps.matchCache.invalidateJob(job.id);
    report[existing ? 'updated' : 'created']++;
    report.items.push({
      row,
      jobId: job.id,
      title: job.title,
      result: existing ? 'updated' : 'created',
      status: job.status,
      warnings: unknownSkills.length ? [`Skills no reconocidas (omitidas): ${unknownSkills.join(', ')}`] : [],
    });
  }
  return report;
}

const stripUndefined = (r: RawJobRecord) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined && v !== ''));

/** En PDF las skills las propone el extractor de IA a partir del texto de cada vacante. */
async function withExtractedSkills(deps: Deps, records: RawJobRecord[]): Promise<RawJobRecord[]> {
  const taxonomy = await deps.skills.list();
  const byId = new Map(taxonomy.map((s) => [s.id, s]));
  return Promise.all(
    records.map(async (r) => {
      const extracted = await deps.extractor.extract(`${r.title ?? ''}\n${r.description ?? ''}`, taxonomy);
      return {
        ...r,
        description: r.description && r.description.length >= 10 ? r.description : `${r.title ?? ''}. ${r.description ?? ''}`.trim(),
        skills: extracted.map((e) => ({ name: byId.get(e.skillId)?.name ?? e.skillId, level: Math.max(1, e.level), mustHave: false })),
      };
    }),
  );
}
