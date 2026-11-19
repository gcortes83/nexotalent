import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api, problemMessage } from '../api/client';
import { ApplicationMarks } from '../components/ApplicationMarks';
import { ApplicationStepper } from '../components/ApplicationStepper';
import { MatchScoreRing } from '../components/MatchScoreRing';
import { UrgentBadge } from '../components/UrgentBadge';
import { useI18n } from '../i18n';

/** HU-02: dashboard de postulaciones con stepper (GET /v1/bff/candidate/dashboard, 1 llamada). */
export function CandidateDashboardPage() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const dash = useQuery({ queryKey: ['candidate-dashboard'], queryFn: api.candidateDashboard, refetchInterval: 30_000 });
  const withdraw = useMutation({
    mutationFn: api.withdraw,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidate-dashboard'] }),
  });

  if (dash.isLoading) return <p className="muted">{t.candidate.loading}</p>;
  if (dash.isError) return <p role="alert" className="error">{problemMessage(dash.error)}</p>;
  const d = dash.data!;

  return (
    <section>
      <header className="page-header">
        <h1>{t.candidate.hello(d.candidate.fullName.split(' ')[0]!)}</h1>
        <p className="muted">{t.candidate.activeOf(d.summary.active, d.summary.total)}</p>
      </header>

      {!d.candidate.hasConfirmedSkills && (
        <p className="card aurora">{t.candidate.confirmSkills}<Link className="btn" to="/c/profile">{t.candidate.goProfile}</Link></p>
      )}

      <h2>{t.candidate.applications}</h2>
      {d.applications.length === 0 && <p className="muted">{t.candidate.noApplications}<Link to="/jobs">{t.candidate.explore}</Link>.</p>}
      <ul className="stack">
        {d.applications.map((a) => (
          <li key={a.id} className="card">
            <header className="row between">
              <div>
                <h3><Link to={`/jobs/${a.jobId}`}>{a.job?.title ?? t.candidate.job}</Link></h3>
                <p className="muted small">{a.job?.organizationName}</p>
                <ApplicationMarks status={a.status} jobStatus={a.job?.status} />
              </div>
              {a.matchScore !== null && <MatchScoreRing percent={a.matchScore * 100} size={64} />}
            </header>
            <ApplicationStepper stepper={a.stepper} />
            {!a.stepper.terminal && (
              <button className="btn btn--ghost small" disabled={withdraw.isPending}
                onClick={() => { if (window.confirm(t.candidate.withdrawConfirm)) withdraw.mutate(a.id); }}>
                {t.candidate.withdraw}
              </button>
            )}
          </li>
        ))}
      </ul>
      {withdraw.isError && <p role="alert" className="error">{problemMessage(withdraw.error)}</p>}

      {d.recommendedJobs.length > 0 && (
        <>
          <h2>{t.candidate.recommended}<span className="ai-badge">✦ IA</span></h2>
          <ul className="grid">
            {d.recommendedJobs.map((j) => (
              <li key={j.id} className="card job-card row between">
                <div>
                  <h3 className="title-with-badge"><Link to={`/jobs/${j.id}`}>{j.title}</Link>{j.urgent && <UrgentBadge compact />}</h3>
                  <p className="muted small">{j.organizationName}</p>
                </div>
                <MatchScoreRing percent={j.scorePercent} size={64} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
