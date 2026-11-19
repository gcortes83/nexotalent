import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router';
import { api } from '../api/client';
import { homeFor, useSession } from '../auth/session';
import { useI18n } from '../i18n';
import { UrgentBadge } from '../components/UrgentBadge';

const AXES = ['Lenguajes', 'Frameworks', 'Cloud', 'Datos', 'Soft skills', 'Idiomas'];
/** Eje de soft skills: se destaca en verde, como en el radar del match. */
const SOFT_INDEX = AXES.indexOf('Soft skills');

/** Radar decorativo animado (la versión accesible y real está en el detalle de cada vacante). */
function HeroRadar({ softLabel }: { softLabel: string }) {
  const cx = 150;
  const cy = 150;
  const r = 110;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
    return `${cx + Math.cos(a) * r * v},${cy + Math.sin(a) * r * v}`;
  };
  const job = [0.9, 0.7, 0.8, 0.5, 0.7, 0.6];
  const you = [0.85, 0.8, 0.55, 0.6, 0.9, 0.7];
  return (
    <svg viewBox="0 0 300 300" className="hero-radar" aria-hidden>
      <defs>
        <linearGradient id="nx-grad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#7c5cff" />
          <stop offset="60%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} points={AXES.map((_, i) => pt(i, k)).join(' ')} className="hero-radar__grid" />
      ))}
      {AXES.map((_, i) => <line key={i} x1={cx} y1={cy} x2={pt(i, 1).split(',')[0]} y2={pt(i, 1).split(',')[1]} className="hero-radar__grid" />)}
      <polygon points={job.map((v, i) => pt(i, v)).join(' ')} className="hero-radar__job" />
      <polygon points={you.map((v, i) => pt(i, v)).join(' ')} className="hero-radar__you" />
      {/* Soft skills en verde: eje, valores de vacante y tuyo, y etiqueta. */}
      <line x1={cx} y1={cy} x2={pt(SOFT_INDEX, 1).split(',')[0]} y2={pt(SOFT_INDEX, 1).split(',')[1]} className="hero-radar__soft-axis" />
      <circle cx={pt(SOFT_INDEX, job[SOFT_INDEX]!).split(',')[0]} cy={pt(SOFT_INDEX, job[SOFT_INDEX]!).split(',')[1]} r="3.5" className="hero-radar__soft-job" />
      {you.map((v, i) => (
        <circle key={i} cx={pt(i, v).split(',')[0]} cy={pt(i, v).split(',')[1]} r={i === SOFT_INDEX ? 5.5 : 4}
          className={i === SOFT_INDEX ? 'hero-radar__dot hero-radar__dot--soft' : 'hero-radar__dot'} style={{ animationDelay: `${i * 0.25}s` }} />
      ))}
      <text x={Number(pt(SOFT_INDEX, 1.12).split(',')[0])} y={Number(pt(SOFT_INDEX, 1.12).split(',')[1]) + 4} textAnchor="middle" className="hero-radar__soft-label">{softLabel}</text>
    </svg>
  );
}

/** Ícono animado: persona (el candidato) con halo que pulsa y un destello que gira. */
function CandidateIcon() {
  return (
    <span className="claim-icon" aria-hidden="true">
      <svg viewBox="0 0 32 32" width="30" height="30" focusable="false">
        <defs>
          <linearGradient id="claim-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c5cff" />
            <stop offset="60%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="14" className="claim-icon__halo" />
        <circle cx="14" cy="12" r="4.6" fill="url(#claim-grad)" />
        <path d="M5.8 25.4c1.3-4.6 4.4-7 8.2-7s6.9 2.4 8.2 7" fill="none" stroke="url(#claim-grad)" strokeWidth="2.6" strokeLinecap="round" />
        <path className="claim-icon__spark" d="M25 4.5l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z" fill="#34d399" />
      </svg>
    </span>
  );
}

export function LandingPage() {
  const { user, loading } = useSession();
  const { t } = useI18n();
  const jobs = useQuery({ queryKey: ['jobs', 'landing'], queryFn: () => api.searchJobs({ pageSize: 3 }) });

  if (loading) return null;
  if (user) return <Navigate to={homeFor(user)} replace />;

  const featured = (jobs.data?.items ?? []).slice(0, 3);
  const openJobs = jobs.data ? (jobs.data.total ?? jobs.data.items.length) : null;

  return (
    <div className="landing has-ai-bg">
      {/* Leyenda superior derecha con ícono animado. */}
      <p className="landing__claim" data-testid="landing-claim">
        {/* «NexoTalent» con el diseño del logo (Nexo + Talent en degradado); los lectores de pantalla leen la frase completa. */}
        <span className="sr-only">{t.landing.claim}</span>
        <span aria-hidden="true">
          <span className="claim-brand">Nexo<span className="gradient-text">Talent</span></span>{t.landing.claimRest}
        </span>
        <CandidateIcon />
      </p>
      <section className="hero">
        <div className="hero__glow" aria-hidden />
        <div className="hero__copy">
          <p className="ai-badge hero__eyebrow">{t.landing.eyebrow}</p>
          <h1 className="hero__title">
            {t.landing.titleA}<span className="gradient-text">{t.landing.titleB}</span>.
          </h1>
          <p className="hero__lead muted">{t.landing.lead}</p>
          <div className="row hero__ctas">
            <Link className="btn btn--primary btn--lg" to="/registro/candidato">{t.landing.ctaCandidate}</Link>
            <Link className="btn btn--lg" to="/registro/empleador">{t.landing.ctaEmployer}</Link>
          </div>
          <p className="small muted">
            {t.landing.haveAccount} <Link to="/login">{t.landing.signIn}</Link> · <Link to="/jobs">{t.landing.explore}</Link>
          </p>
        </div>
        <div className="hero__visual">
          <HeroRadar softLabel={t.soft.legend} />
          <div className="hero__score card ai-glow">
            <span className="hero__score-value gradient-text">87%</span>
            <span className="small muted">{t.landing.scoreCaption}</span>
            <span className="small">✔ TypeScript · ✔ Node.js · △ AWS</span>
            <span className="small hero__soft">✔ {t.soft.title}: {t.soft.example}</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="choose" className="landing__section">
        <h2 id="choose" className="sr-only">{t.landing.chooseTitle}</h2>
        <ul className="choice-grid">
          <li className="card choice ai-glow">
            <span className="choice__icon" aria-hidden>🧑‍💻</span>
            <h3>{t.landing.candidates}</h3>
            <p className="muted">{t.landing.candidatesText}</p>
            <Link className="btn btn--primary" to="/registro/candidato">{t.landing.candidatesCta}</Link>
          </li>
          <li className="card choice ai-glow">
            <span className="choice__icon" aria-hidden>🏢</span>
            <h3>{t.landing.employers}</h3>
            <p className="muted">{t.landing.employersText}</p>
            <Link className="btn btn--primary" to="/registro/empleador">{t.landing.employersCta}</Link>
          </li>
          <li className="card choice ai-glow">
            <span className="choice__icon" aria-hidden>🔎</span>
            <h3>{t.landing.jobs}</h3>
            <p className="muted">{openJobs !== null ? t.landing.openJobs(openJobs) : t.landing.openJobsFallback} {t.landing.jobsText}</p>
            <div className="row">
              <Link className="btn" to="/jobs">{t.landing.jobsCta}</Link>
              {!!jobs.data?.facets?.urgent && <Link className="btn btn--ghost urgent-link" to="/jobs?urgent=true"><UrgentBadge compact /> {t.landing.urgentCount(jobs.data.facets.urgent)}</Link>}
            </div>
          </li>
        </ul>
      </section>

      <section id="como-funciona" aria-labelledby="how" className="landing__section">
        <h2 id="how">{t.landing.howTitle}</h2>
        <ol className="steps-grid">
          {t.landing.steps.map((s, i) => (
            <li key={s.title} className="card"><span className="step-num">{i + 1}</span><h3>{s.title}</h3><p className="muted small">{s.text}</p></li>
          ))}
        </ol>
      </section>

      {featured.length > 0 && (
        <section aria-labelledby="featured" className="landing__section">
          <header className="row between">
            <h2 id="featured">{t.landing.featured}</h2>
            <Link to="/jobs">{t.landing.seeAll}</Link>
          </header>
          <ul className="grid">
            {featured.map((j) => (
              <li key={j.id} className="card job-card">
                <h3 className="title-with-badge"><Link to={`/jobs/${j.id}`}>{j.title}</Link>{j.urgent && <UrgentBadge compact />}</h3>
                <p className="muted small">{j.organizationName} · {t.modality[j.modality]} · {t.countries[j.country] ?? j.country}</p>
                <p className="chips">{j.skills.slice(0, 4).map((s) => <span key={s.name} className="chip">{s.name}</span>)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="landing__section card aurora trust">
        <h2>{t.landing.trustTitle}</h2>
        <p className="muted">{t.landing.trustText}</p>
      </section>
    </div>
  );
}
