import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { problemMessage } from '../api/client';
import type { AccountKind } from '../api/types';
import { homeFor, safeNext, useSession } from '../auth/session';
import { useI18n } from '../i18n';

const DEMO_EMAILS = [
  'candidata@example.com', 'nueva@example.com', 'candidato@example.com',
  'valeria@example.com', 'diego@example.com', 'mariana@example.com', 'jorge@example.com',
  'reclutador@example.com', 'reclutadora@example.com',
  'salud@example.com', 'logistica@example.com', 'edtech@example.com', 'banca@example.com', 'agro@example.com', 'turismo@example.com',
];

/**
 * /login            → login con correo y contraseña, con pestañas Candidato / Empleador.
 * /login?demo=1     → cuentas de demo sin contraseña (requiere DEMO_AUTH=true en la API).
 * /login?tipo=empleador preselecciona la pestaña de empleador.
 * /login?next=/jobs/… vuelve a esa ruta tras entrar (p. ej. para postular a una vacante).
 */
export function LoginPage() {
  const { user } = useSession();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  if (user) return <Navigate to={next ?? homeFor(user)} replace />;
  return (
    <div className="has-ai-bg auth-page">
      {params.has('demo') ? <DemoLogin next={next} /> : <PasswordLogin next={next} initialKind={params.get('tipo') === 'empleador' ? 'employer' : 'candidate'} />}
    </div>
  );
}

function PasswordLogin({ initialKind, next }: { initialKind: AccountKind; next: string | null }) {
  const { loginWithPassword } = useSession();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [kind, setKind] = useState<AccountKind>(initialKind);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await loginWithPassword(email, password, kind);
      navigate(next && user.role === 'candidate' ? next : homeFor(user));
    } catch (err) {
      setError(problemMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const tab = (k: AccountKind, label: string) => (
    <button type="button" role="tab" id={`tab-${k}`} aria-selected={kind === k} aria-controls="login-panel"
      className={`tab${kind === k ? ' tab--active' : ''}`} onClick={() => { setKind(k); setError(null); }}>
      {label}
    </button>
  );
  const registerNext = next ? `?next=${encodeURIComponent(next)}` : '';

  return (
    <section className="auth card aurora">
      <h1>{t.auth.title} <span className="gradient-text">AI</span></h1>
      {next?.startsWith('/jobs/') && <p className="card aurora small" role="note">{t.auth.applyHint}</p>}
      <div role="tablist" aria-label={t.auth.accountType} className="tabs">
        {tab('candidate', t.auth.candidate)}
        {tab('employer', t.auth.employer)}
      </div>
      <form id="login-panel" role="tabpanel" aria-labelledby={`tab-${kind}`} className="form" onSubmit={submit}>
        <label htmlFor="login-email">{t.auth.email}</label>
        <input id="login-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="login-password">{t.auth.password}</label>
        <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn btn--primary btn--lg" disabled={busy}>
          {busy ? t.auth.entering : kind === 'candidate' ? t.auth.enterAsCandidate : t.auth.enterAsEmployer}
        </button>
        {error && <p role="alert" className="error">{error}</p>}
      </form>
      <p className="small muted">
        {t.auth.noAccount}{' '}
        {kind === 'candidate'
          ? <Link to={`/registro/candidato${registerNext}`}>{t.auth.registerCandidate}</Link>
          : <Link to="/registro/empleador">{t.auth.registerEmployer}</Link>}
      </p>
    </section>
  );
}

function DemoLogin({ next }: { next: string | null }) {
  const { login } = useSession();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const enter = async (email: string) => {
    setBusy(email);
    setError(null);
    try {
      const user = await login(email);
      navigate(next && user.role === 'candidate' ? next : homeFor(user));
    } catch (e) {
      setError(problemMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="login card aurora">
      <h1>NexoTalent <span className="gradient-text">AI</span></h1>
      <p className="muted">{t.auth.demoIntro}</p>
      <ul className="stack" aria-label={t.auth.demoAccounts}>
        {DEMO_EMAILS.map((email) => (
          <li key={email}>
            <button className="btn btn--block" onClick={() => enter(email)} disabled={busy !== null}>
              {busy === email ? t.auth.entering : t.auth.demoLabels[email]}
              <small className="muted"> {email}</small>
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="error">{error}</p>}
      <p className="muted small">{t.auth.demoNote}</p>
    </section>
  );
}
