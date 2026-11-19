import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router';
import { api, ApiError, problemMessage } from '../api/client';
import type { JobMatch } from '../api/types';
import { useSession } from '../auth/session';
import { AIBadge } from '../components/AIBadge';
import { JobDescription } from '../components/JobDescription';
import { formatMoney } from '../components/labels';
import { MatchScoreRing } from '../components/MatchScoreRing';
import { SkillComparisonRadars } from '../components/SkillComparisonRadars';
import { UrgentBadge } from '../components/UrgentBadge';
import { type Dict, useI18n } from '../i18n';

/** Explicación del score redactada en el idioma activo a partir de los datos del match. */
/** Categoría de la taxonomía que agrupa las habilidades blandas. */
export const SOFT = 'Soft skills';

export function explainMatch(m: JobMatch, t: Dict): string {
  if (m.score === 0 && m.strengths.length === 0 && m.factors.skillCoverage === 0) return t.job.noSkillsYet;
  const gaps = m.gaps.map((g) => t.job.gapItem(g.skill, g.required, g.candidate)).join(', ');
  return t.job.explanation(m.strengths.length, m.strengths.length + m.gaps.length, m.strengths, gaps, m.missingMustHaves);
}

export function JobDetailPage() {
  const { jobId = '' } = useParams();
  const [params] = useSearchParams();
  const { user, loading } = useSession();
  const { t } = useI18n();
  const qc = useQueryClient();
  const isCandidate = user?.role === 'candidate';

  const job = useQuery({ queryKey: ['job', jobId], queryFn: () => api.job(jobId) });
  const match = useQuery({ queryKey: ['match', jobId], queryFn: () => api.match(jobId), enabled: isCandidate });
  const dashboard = useQuery({ queryKey: ['candidate-dashboard'], queryFn: api.candidateDashboard, enabled: isCandidate });
  // Niveles confirmados del candidato para los radares por skill.
  const profile = useQuery({ queryKey: ['profile'], queryFn: api.myProfile, enabled: isCandidate });
  const applied = dashboard.data?.applications.some((a) => a.jobId === jobId);

  const apply = useMutation({
    mutationFn: () => api.apply(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidate-dashboard'] });
      qc.invalidateQueries({ queryKey: ['job', jobId] });
    },
  });

  if (job.isLoading) return <p className="muted">{t.common.loading}</p>;
  if (job.error) {
    return <p role="alert" className="error">{job.error instanceof ApiError && job.error.status === 404 ? t.job.notFound : problemMessage(job.error)}</p>;
  }
  const j = job.data!;
  const here = `/jobs/${encodeURIComponent(jobId)}`;
  const location = [j.city, t.countries[j.country] ?? j.country].filter(Boolean).join(', ');

  return (
    <article className="job-detail">
      <header className="page-header">
        <div>
          <p className="muted"><Link to="/jobs">{t.job.back}</Link></p>
          <h1 className="title-with-badge">{j.title}{j.urgent && <UrgentBadge />}</h1>
          {j.urgent && <p className="small urgent-note">{t.urgent.note}</p>}
          <p className="muted">
            {j.organizationName} · {t.modality[j.modality]} · {location} · {t.seniority[j.seniority] ?? j.seniority}
            {j.salary && <> · {t.job.upToMonthly(formatMoney(j.salary.max, j.salary.currency))}</>}
          </p>
          <p className="small muted">{t.jobs.positions(j.positionsAvailable, j.positionsTotal)} · {t.jobs.applicants(j.applicantsCount)}</p>
        </div>
        {isCandidate && (
          <div className="row">
            {applied || apply.isSuccess ? (
              <Link className="btn" to="/c/dashboard">{t.job.seeMyApplication}</Link>
            ) : (
              <button className="btn btn--primary btn--lg" onClick={() => apply.mutate()} disabled={apply.isPending}>
                {apply.isPending ? t.job.applying : t.job.apply}
              </button>
            )}
          </div>
        )}
      </header>
      {isCandidate && params.has('registered') && !applied && !apply.isSuccess && (
        <p className="card aurora" role="status">{t.job.welcomeApply}</p>
      )}
      {apply.isError && <p role="alert" className="error">{problemMessage(apply.error)}</p>}
      {apply.isSuccess && <p role="status" className="success">{t.job.applied}</p>}

      {!loading && !user && (
        <section className="card apply-cta ai-glow" aria-labelledby="apply-title">
          <div>
            <h2 id="apply-title">{t.job.applyTitle}</h2>
            <p className="muted">{t.job.applyAnon}</p>
          </div>
          <div className="row">
            <Link className="btn btn--primary btn--lg" to={`/registro/candidato?next=${encodeURIComponent(here)}&job=${encodeURIComponent(j.title)}`}>
              {t.job.applyRegister}
            </Link>
            <Link className="btn" to={`/login?next=${encodeURIComponent(here)}`}>{t.job.applyLogin}</Link>
          </div>
        </section>
      )}
      {user && !isCandidate && <p className="card muted" role="note">{t.job.applyEmployer}</p>}

      <div className="two-col">
        <section className="card">
          <h2>{t.job.description}</h2>
          <JobDescription text={j.description} />
          <h3>{t.job.requiredSkills}</h3>
          <ul className="chips" aria-label={t.job.requiredSkills}>
            {j.skills.filter((s) => s.category !== SOFT).map((s) => (
              <li key={s.name} className={`chip${s.mustHave ? ' chip--must' : ''}`}>
                {s.name} · {s.level}/5{s.mustHave && <span className="sr-only">{t.job.mandatoryParen}</span>}
              </li>
            ))}
          </ul>
          {j.skills.some((s) => s.category === SOFT) && (
            <>
              <h3 className="soft-skills-heading">{t.soft.title}</h3>
              <ul className="chips" aria-label={t.soft.title}>
                {j.skills.filter((s) => s.category === SOFT).map((s) => (
                  <li key={s.name} className="chip chip--soft">{s.name} · {s.level}/5</li>
                ))}
              </ul>
            </>
          )}
        </section>

        {isCandidate && (
          <section className="card ai-glow match-card" aria-labelledby="match-title">
            <header className="row between">
              <h2 id="match-title">{t.job.yourMatch}</h2>
              <AIBadge>{t.job.explainable}</AIBadge>
            </header>
            {match.isLoading && <div className="skeleton" style={{ height: 320 }} />}
            {match.isError && <p role="alert" className="error">{problemMessage(match.error)}</p>}
            {match.data && (
              <div className="match-layout">
                <div className="match-layout__text">
                <div className="row">
                  <MatchScoreRing percent={match.data.scorePercent} />
                  <p className="explanation">{explainMatch(match.data, t)}</p>
                </div>
                {match.data.score === 0 && (
                  <p><Link to="/c/profile" className="btn">{t.job.uploadCv}</Link></p>
                )}
                <div className="two-col">
                  <div>
                    <h3>{t.job.strengths}</h3>
                    {match.data.strengths.length ? <ul>{match.data.strengths.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="muted">{t.common.none}</p>}
                  </div>
                  <div>
                    <h3>{t.job.gaps}</h3>
                    {match.data.gaps.length ? (
                      <ul>
                        {match.data.gaps.map((g) => (
                          <li key={g.skill}>
                            {g.skill} <span className="muted">{t.job.requiresHave(g.required, g.candidate)}</span>
                            {g.mustHave && <span className="chip chip--must">{t.jobs.mandatory}</span>}
                          </li>
                        ))}
                      </ul>
                    ) : <p className="muted">{t.job.noGaps}</p>}
                  </div>
                </div>
                <p className="small muted">{t.job.ethics}</p>
                </div>
                <div className="match-layout__radar">
                  <SkillComparisonRadars jobSkills={j.skills} candidateSkills={profile.data?.skills ?? []} />
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </article>
  );
}
