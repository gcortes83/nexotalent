import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, problemMessage } from '../api/client';
import type { JobApplicant, RecruiterSettableStatus } from '../api/types';
import { NEXT_STATUSES } from '../components/labels';
import { useI18n } from '../i18n';
import { MatchScoreRing } from '../components/MatchScoreRing';

/** Candidatos de una vacante ordenados por match + cambio de estatus con If-Match. */
export function JobApplicantsPage() {
  const { jobId = '' } = useParams();
  const qc = useQueryClient();
  const { t } = useI18n();
  const job = useQuery({ queryKey: ['job', jobId], queryFn: () => api.job(jobId), retry: false });
  const applicants = useQuery({ queryKey: ['applicants', jobId], queryFn: () => api.jobApplicants(jobId) });
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const change = useMutation({
    mutationFn: (v: { app: JobApplicant; to: RecruiterSettableStatus }) => api.changeStatus(v.app.id, v.to, v.app.version),
    onSuccess: (updated) => {
      setFeedback({ ok: true, text: t.employer.statusUpdated(t.status[updated.status]) });
      qc.invalidateQueries({ queryKey: ['applicants', jobId] });
      qc.invalidateQueries({ queryKey: ['employer-dashboard'] });
    },
    onError: (e) => {
      setFeedback({ ok: false, text: problemMessage(e) });
      qc.invalidateQueries({ queryKey: ['applicants', jobId] });
    },
  });

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="muted"><Link to="/e/dashboard">{t.employer.backDashboard}</Link></p>
          <h1>{job.data?.title ?? t.employer.candidates}</h1>
          <p className="muted small">{t.employer.orderedByMatch}</p>
        </div>
      </header>
      {feedback && <p role={feedback.ok ? 'status' : 'alert'} className={feedback.ok ? 'success' : 'error'}>{feedback.text}</p>}
      {applicants.isLoading && <p className="muted">{t.common.loading}</p>}
      {applicants.isError && <p role="alert" className="error">{problemMessage(applicants.error)}</p>}
      {applicants.data?.length === 0 && <p className="muted">{t.employer.noApplications}</p>}
      <ul className="stack">
        {applicants.data?.map((a) => (
          <li key={a.id} className="card row between">
            <div className="row">
              <MatchScoreRing percent={(a.matchScore ?? 0) * 100} size={64} />
              <div>
                <h3>{a.candidate?.fullName ?? t.employer.candidate}</h3>
                <p className="muted small">{a.candidate?.headline} {a.candidate?.seniority && `· ${t.seniority[a.candidate.seniority] ?? a.candidate.seniority}`}</p>
                <p className="small">
                  <span className="badge">{t.status[a.status]}</span>
                  {a.staleDays >= 3 && <span className={`badge ${a.staleDays >= 5 ? 'badge--negative' : 'badge--warning'}`}> {t.employer.daysNoChange(a.staleDays)}</span>}
                </p>
              </div>
            </div>
            {NEXT_STATUSES[a.status] && (
              <div className="row" role="group" aria-label={t.employer.changeStatusOf(a.candidate?.fullName ?? t.employer.candidate)}>
                {NEXT_STATUSES[a.status]!.map((to) => (
                  <button key={to} className={`btn small${to === 'rejected' ? ' btn--ghost' : ''}`} disabled={change.isPending}
                    onClick={() => change.mutate({ app: a, to: to as RecruiterSettableStatus })}>
                    {t.status[to]}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
