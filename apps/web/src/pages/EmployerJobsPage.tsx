import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, problemMessage } from '../api/client';
import type { EmployerJob, JobStatus } from '../api/types';
import { useToast } from '../components/Toast';
import { UrgentBadge } from '../components/UrgentBadge';
import { useI18n } from '../i18n';

const STATUS_TONE: Partial<Record<JobStatus, string>> = { published: 'badge--positive', closed: 'badge--negative', draft: '' };

type Filter = 'active' | 'draft' | 'closed' | 'all';
const FILTERS: Filter[] = ['active', 'draft', 'closed', 'all'];
const inFilter = (j: EmployerJob, f: Filter) =>
  f === 'all' || (f === 'active' ? j.status === 'published' : f === 'draft' ? j.status === 'draft' : j.status === 'closed');

/** Gestión de vacantes del empleador: crear, editar, publicar, cerrar (soft delete) e importar. */
export function EmployerJobsPage() {
  const qc = useQueryClient();
  const { show } = useToast();
  const { t } = useI18n();
  const [params] = useSearchParams();
  const [filter, setFilter] = useState<Filter>('all');
  const jobs = useQuery({ queryKey: ['employer-jobs'], queryFn: api.employerJobs });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['employer-jobs'] });
    qc.invalidateQueries({ queryKey: ['employer-dashboard'] });
    qc.invalidateQueries({ queryKey: ['jobs'] });
  };
  const publish = useMutation({
    mutationFn: api.publishJob,
    onSuccess: (j) => { refresh(); show({ title: t.employer.published, body: t.employer.publishedBody(j.title), tone: 'success' }); },
  });
  const close = useMutation({
    mutationFn: api.closeJob,
    onSuccess: (j) => {
      refresh();
      show({ title: t.employer.closed, body: t.employer.closedBody(j.notifiedCandidates), tone: 'warning' });
    },
  });
  const error = publish.error ?? close.error;
  const list = (jobs.data ?? []).filter((j) => inFilter(j, filter));

  const confirmClose = (j: EmployerJob) => {
    if (window.confirm(t.employer.closeConfirm(j.title))) close.mutate(j.id);
  };

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>{t.employer.myJobs}</h1>
          <p className="muted small">{t.employer.jobsLead}</p>
        </div>
        <div className="row">
          <Link className="btn" to="/e/importar">{t.employer.importBtn}</Link>
          <Link className="btn btn--primary" to="/e/vacantes/nueva">{t.employer.newJob}</Link>
        </div>
      </header>
      {params.has('bienvenida') && <p className="card aurora" role="status">{t.employer.welcome}</p>}

      <div role="group" aria-label={t.employer.filterJobs} className="row filters">
        {FILTERS.map((f) => (
          <button key={f} className={`chip chip--button${filter === f ? ' chip--active' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {t.employer.filters[f]} <span className="muted">{(jobs.data ?? []).filter((j) => inFilter(j, f)).length}</span>
          </button>
        ))}
      </div>

      {jobs.isLoading && <p className="muted">{t.common.loading}</p>}
      {jobs.isError && <p role="alert" className="error">{problemMessage(jobs.error)}</p>}
      {error && <p role="alert" className="error">{problemMessage(error)}</p>}
      {jobs.data && list.length === 0 && (
        <div className="card empty">
          <p className="muted">{t.employer.emptyView}</p>
          <Link className="btn btn--primary" to="/e/vacantes/nueva">{t.employer.createJob}</Link>
        </div>
      )}

      {list.length > 0 && (
        <table className="table table--stack">
          <caption className="sr-only">{t.employer.jobsCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{t.employer.colJob}</th><th scope="col">{t.employer.colStatus}</th><th scope="col">{t.employer.colPositions}</th>
              <th scope="col">{t.employer.colApplicants}</th><th scope="col">{t.employer.colSource}</th><th scope="col">{t.employer.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((j) => (
              <tr key={j.id} className={j.status === 'closed' ? 'row--muted' : ''}>
                <th scope="row">
                  {j.title} {j.urgent && <UrgentBadge compact />}
                  <div className="small muted">{t.modality[j.modality]} · {j.country}{j.externalId ? ` · ${j.externalId}` : ''}</div>
                </th>
                <td data-label={t.employer.colStatus}><span className={`badge ${STATUS_TONE[j.status] ?? ''}`}>{t.jobStatus[j.status]}</span></td>
                <td data-label={t.employer.colPositions}>{j.positionsTotal - j.positionsAvailable}/{j.positionsTotal}</td>
                <td data-label={t.employer.colApplicants}>{j.applicantsCount}</td>
                <td data-label={t.employer.colSource}><span className="small muted">{t.employer.sources[j.sourceType]}</span></td>
                <td className="table__actions">
                  <div className="row actions" role="group" aria-label={t.employer.actionsOf(j.title)}>
                    <Link className="btn small" to={`/e/jobs/${j.id}`}>{t.employer.candidatesBtn}</Link>
                    {j.status !== 'closed' && <Link className="btn small" to={`/e/vacantes/${j.id}/editar`}>{t.employer.edit}</Link>}
                    {j.status === 'draft' && (
                      <button className="btn small btn--primary" disabled={publish.isPending} onClick={() => publish.mutate(j.id)}>{t.employer.publish}</button>
                    )}
                    {['draft', 'published', 'on_hold', 'pending_payment'].includes(j.status) && (
                      <button className="btn small btn--ghost danger" disabled={close.isPending} onClick={() => confirmClose(j)}>{t.employer.closeJob}</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
