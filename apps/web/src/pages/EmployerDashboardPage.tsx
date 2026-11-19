import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api, problemMessage } from '../api/client';
import { useI18n } from '../i18n';

export function EmployerDashboardPage() {
  const { t } = useI18n();
  const dash = useQuery({ queryKey: ['employer-dashboard'], queryFn: api.employerDashboard, refetchInterval: 60_000 });
  if (dash.isLoading) return <p className="muted">{t.common.loading}</p>;
  if (dash.isError) return <p role="alert" className="error">{problemMessage(dash.error)}</p>;
  const d = dash.data!;

  return (
    <section>
      <header className="page-header"><h1>{t.employer.dashboardTitle}</h1></header>

      <section className="card" aria-labelledby="stale-title">
        <h2 id="stale-title">{t.employer.stale}</h2>
        {d.staleApplications.length === 0 ? (
          <p className="muted">{t.employer.allGood}</p>
        ) : (
          <ul className="stack">
            {d.staleApplications.map((s) => (
              <li key={s.applicationId} className="row between">
                <span>
                  <span className={`badge ${s.level === 'escalated' ? 'badge--negative' : 'badge--warning'}`}>
                    {t.employer.staleDays(s.staleDays, s.level === 'escalated')}
                  </span>{' '}
                  {s.jobTitle} · {t.status[s.status]}
                </span>
                <Link className="btn small" to={`/e/jobs/${s.jobId}`}>{t.employer.review}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <h2>{t.employer.myJobs}</h2>
      <table className="table table--stack">
        <thead>
          <tr><th scope="col">{t.employer.colJob}</th><th scope="col">{t.employer.colPositions}</th><th scope="col">{t.employer.colApplicants}</th><th scope="col">{t.employer.colInProcess}</th><th /></tr>
        </thead>
        <tbody>
          {d.jobs.map((j) => (
            <tr key={j.id}>
              <th scope="row">{j.title} {j.status !== 'published' && <span className="chip">{t.jobStatus[j.status as keyof typeof t.jobStatus] ?? j.status}</span>}</th>
              <td data-label={t.employer.colPositions}>{t.employer.covered(j.positionsTotal - j.positionsAvailable, j.positionsTotal)}</td>
              <td data-label={t.employer.colApplicants}>{j.applicantsCount}</td>
              <td data-label={t.employer.colInProcess}>{Object.values(j.pipeline).reduce((a, b) => a + b, 0)}</td>
              <td className="table__actions"><Link to={`/e/jobs/${j.id}`}>{t.employer.seeCandidates}</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
