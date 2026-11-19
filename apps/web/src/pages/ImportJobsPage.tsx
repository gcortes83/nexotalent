import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { api, problemMessage } from '../api/client';
import type { ImportFormat } from '../api/types';
import { useI18n } from '../i18n';

export const CSV_TEMPLATE =
  'externalId,title,description,seniority,modality,country,city,salaryMin,salaryMax,currency,positions,skills,urgent\n' +
  'REQ-001,Backend Engineer Node.js,"APIs con Fastify y PostgreSQL.",senior,remote,MX,,4000,5500,USD,2,"TypeScript:4:must;Node.js:4:must;PostgreSQL:3",sí\n' +
  'REQ-002,Analista de datos,Reportes y tableros.,junior,hybrid,MX,Ciudad de México,1500,2000,USD,1,"SQL:3:must;Power BI:3",no\n';

const JSON_EXAMPLE = JSON.stringify(
  [{ externalId: 'REQ-003', title: 'QA Automation', description: 'Pruebas E2E con Playwright.', seniority: 'mid',
    location: { country: 'MX', city: null, modality: 'remote' }, salary: { min: 2500, max: 3200, currency: 'USD' },
    positions: 1, urgent: true, skills: [{ name: 'Testing automatizado', level: 4, mustHave: true }] }],
  null, 2,
);

const FORMATS: { id: ImportFormat; label: string; accept: string }[] = [
  { id: 'csv', label: 'CSV', accept: '.csv,text/csv' },
  { id: 'json', label: 'JSON', accept: '.json,application/json' },
  { id: 'pdf', label: 'PDF', accept: '.pdf,application/pdf' },
];

const download = (name: string, content: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
};

/** Importación de vacantes en CSV, JSON (CanonicalJob) o PDF (docs/04-integraciones.md §2). */
export function ImportJobsPage() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [format, setFormat] = useState<ImportFormat>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [publish, setPublish] = useState(false);
  const current = FORMATS.find((x) => x.id === format)!;

  const run = useMutation({
    mutationFn: () => api.importJobs(format, file!, publish),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employer-jobs'] });
      qc.invalidateQueries({ queryKey: ['employer-dashboard'] });
      qc.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
  const r = run.data;

  return (
    <section>
      <Link to="/e/vacantes">{t.importJobs.back}</Link>
      <header className="page-header"><h1>{t.importJobs.title}</h1></header>
      <div className="two-col">
        <form className="card" onSubmit={(e) => { e.preventDefault(); if (file) run.mutate(); }} aria-label={t.importJobs.form}>
          <fieldset className="field">
            <legend>{t.importJobs.format}</legend>
            <div className="row" role="radiogroup">
              {FORMATS.map((x) => (
                <label key={x.id} className={`chip chip--button${format === x.id ? ' chip--active' : ''}`}>
                  <input type="radio" name="format" className="sr-only" checked={format === x.id}
                    onChange={() => { setFormat(x.id); setFile(null); run.reset(); }} />
                  {x.label}
                </label>
              ))}
            </div>
            <p className="small muted">{t.importJobs.help[format]}</p>
          </fieldset>
          <div className="dropzone">
            <label htmlFor="import-file">{t.importJobs.file(current.label)}</label>
            <input key={format} id="import-file" type="file" accept={current.accept} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          {format !== 'pdf' && (
            <label className="row small"><input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
              {t.importJobs.publishNow}</label>
          )}
          <button className="btn btn--primary" disabled={!file || run.isPending}>{run.isPending ? t.importJobs.importing : t.importJobs.import}</button>
          {run.isError && <p role="alert" className="error">{problemMessage(run.error)}</p>}
        </form>

        <aside className="card">
          <h2>{t.importJobs.templates}</h2>
          <p className="small muted">{t.importJobs.templatesNote}</p>
          <div className="row">
            <button type="button" className="btn small" onClick={() => download('plantilla-vacantes.csv', CSV_TEMPLATE, 'text/csv')}>{t.importJobs.downloadCsv}</button>
            <button type="button" className="btn small" onClick={() => download('ejemplo-vacantes.json', JSON_EXAMPLE, 'application/json')}>{t.importJobs.downloadJson}</button>
          </div>
          <pre className="code small">{format === 'json' ? JSON_EXAMPLE : format === 'csv' ? CSV_TEMPLATE : 'Vacante: Desarrollador Java (URGENTE)\nNivel: Senior\nModalidad: Presencial\nSalario: 2500 - 3200 USD\nPosiciones: 2\nBuscamos experiencia con Java, Spring Boot y SQL.\n\nVacante: Analista BI\n…'}</pre>
        </aside>
      </div>

      {r && (
        <section className="card section-gap" aria-labelledby="import-result">
          <h2 id="import-result" role="status">{t.importJobs.result(r.created, r.updated, r.errors.length)}</h2>
          {r.items.length > 0 && (
            <table className="table table--stack">
              <caption className="sr-only">{t.importJobs.caption}</caption>
              <thead><tr><th scope="col">{t.importJobs.colRow}</th><th scope="col">{t.importJobs.colJob}</th><th scope="col">{t.importJobs.colResult}</th><th scope="col">{t.importJobs.colStatus}</th><th scope="col">{t.importJobs.colNotices}</th></tr></thead>
              <tbody>
                {r.items.map((i) => (
                  <tr key={i.row}>
                    <td data-label={t.importJobs.colRow}>{i.row}</td>
                    <th scope="row"><Link to={`/e/vacantes/${i.jobId}/editar`}>{i.title}</Link></th>
                    <td data-label={t.importJobs.colResult}>{i.result === 'created' ? t.importJobs.created : t.importJobs.updated}</td>
                    <td data-label={t.importJobs.colStatus}>{t.jobStatus[i.status as keyof typeof t.jobStatus] ?? i.status}</td>
                    <td data-label={t.importJobs.colNotices} className="small muted">{i.warnings.join(' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {r.errors.length > 0 && (
            <>
              <h3>{t.importJobs.rowErrors}</h3>
              <ul className="small error">{r.errors.map((e) => <li key={e.row}>{t.importJobs.rowError(e.row, e.message)}</li>)}</ul>
            </>
          )}
          <Link className="btn" to="/e/vacantes">{t.importJobs.goJobs}</Link>
        </section>
      )}
    </section>
  );
}
