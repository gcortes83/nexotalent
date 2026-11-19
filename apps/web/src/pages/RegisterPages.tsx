import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { api, problemMessage } from '../api/client';
import type { AuthResponse } from '../api/types';
import { homeFor, safeNext, useSession } from '../auth/session';
import { useI18n } from '../i18n';

const passwordOk = (p: string) => /^(?=.*[A-Za-zÀ-ÿ])(?=.*\d).{8,128}$/.test(p);
const COUNTRIES = ['MX', 'CO', 'AR', 'CL', 'PE', 'ES', 'US'];

/** Tras registrarse vuelve a `next` (p. ej. la vacante a la que quería postular) o a la bienvenida. */
function useRegister(submitFn: () => Promise<AuthResponse>, next: string | null) {
  const { startSession } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Evita que la guarda "ya hay sesión" redirija al dashboard justo después de registrarse.
  const registering = useRef(false);
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    registering.current = true;
    setBusy(true);
    setError(null);
    try {
      const user = startSession(await submitFn());
      if (user.role === 'candidate' && next) navigate(`${next}${next.includes('?') ? '&' : '?'}registered=1`);
      else navigate(user.role === 'candidate' ? '/c/profile?bienvenida=1' : '/e/vacantes?bienvenida=1');
    } catch (err) {
      registering.current = false;
      setError(problemMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return { error, busy, onSubmit, registering };
}

function Field({ id, label, children, hint }: { id: string; label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <small id={`${id}-hint`} className="muted">{hint}</small>}
    </div>
  );
}

/** Tarjeta centrada sobre el fondo animado global (el mismo de la landing). */
function RegisterLayout({ children }: { children: ReactNode }) {
  return <div className="auth-page">{children}</div>;
}

function Privacy({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { t } = useI18n();
  return (
    <label className="row small checkbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} required />
      <span>{t.register.privacy}</span>
    </label>
  );
}

export function RegisterCandidatePage() {
  const { user } = useSession();
  const { t } = useI18n();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const jobTitle = params.get('job');
  const [f, setF] = useState({ fullName: '', email: '', password: '', headline: '', country: 'MX', acceptPrivacy: false });
  const reg = useRegister(() => api.registerCandidate({ ...f, headline: f.headline || null, country: f.country || null }), next);
  if (user && !reg.registering.current) return <Navigate to={next ?? homeFor(user)} replace />;
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <RegisterLayout>
      <section className="auth card aurora">
        <p className="ai-badge">{t.register.candidateBadge}</p>
        <h1>{t.register.candidateTitle}</h1>
        {next ? (
          <p className="card aurora small" role="note">{jobTitle ? t.register.applyHint(jobTitle) : t.register.applyHintGeneric}</p>
        ) : (
          <p className="muted">{t.register.candidateLead}</p>
        )}
        <form className="form" onSubmit={reg.onSubmit} aria-label={t.register.candidateForm}>
          <Field id="c-name" label={t.register.fullName}><input id="c-name" required autoComplete="name" value={f.fullName} onChange={set('fullName')} /></Field>
          <Field id="c-email" label={t.register.email}><input id="c-email" type="email" required autoComplete="email" value={f.email} onChange={set('email')} /></Field>
          <Field id="c-pass" label={t.register.password} hint={t.register.passwordHint}>
            <input id="c-pass" type="password" required autoComplete="new-password" aria-describedby="c-pass-hint" value={f.password} onChange={set('password')} />
          </Field>
          <Field id="c-headline" label={t.register.headline}>
            <input id="c-headline" maxLength={160} placeholder={t.register.headlinePlaceholder} value={f.headline} onChange={set('headline')} />
          </Field>
          <Field id="c-country" label={t.register.country}>
            <select id="c-country" value={f.country} onChange={set('country')}>
              {COUNTRIES.map((c) => <option key={c} value={c}>{t.countries[c]}</option>)}
            </select>
          </Field>
          <Privacy checked={f.acceptPrivacy} onChange={(v) => setF({ ...f, acceptPrivacy: v })} />
          <button className="btn btn--primary btn--lg" disabled={reg.busy || !f.acceptPrivacy || !passwordOk(f.password)}>
            {reg.busy ? t.register.creating : t.register.candidateSubmit}
          </button>
          {reg.error && <p role="alert" className="error">{reg.error}</p>}
        </form>
        <p className="small muted">
          {t.register.haveAccount} <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}>{t.register.signIn}</Link> · {t.register.areYouCompany}{' '}
          <Link to="/registro/empleador">{t.register.registerCompany}</Link>
        </p>
      </section>
    </RegisterLayout>
  );
}

export function RegisterEmployerPage() {
  const { user } = useSession();
  const { t } = useI18n();
  const [f, setF] = useState({ companyName: '', fullName: '', email: '', password: '', acceptPrivacy: false });
  const reg = useRegister(() => api.registerEmployer(f), null);
  if (user && !reg.registering.current) return <Navigate to={homeFor(user)} replace />;
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <RegisterLayout>
      <section className="auth card aurora">
        <p className="ai-badge">{t.register.employerBadge}</p>
        <h1>{t.register.employerTitle}</h1>
        <p className="muted">{t.register.employerLead}</p>
        <form className="form" onSubmit={reg.onSubmit} aria-label={t.register.employerForm}>
          <Field id="e-company" label={t.register.companyName}><input id="e-company" required autoComplete="organization" value={f.companyName} onChange={set('companyName')} /></Field>
          <Field id="e-name" label={t.register.yourName}><input id="e-name" required autoComplete="name" value={f.fullName} onChange={set('fullName')} /></Field>
          <Field id="e-email" label={t.register.workEmail}><input id="e-email" type="email" required autoComplete="email" value={f.email} onChange={set('email')} /></Field>
          <Field id="e-pass" label={t.register.password} hint={t.register.passwordHint}>
            <input id="e-pass" type="password" required autoComplete="new-password" aria-describedby="e-pass-hint" value={f.password} onChange={set('password')} />
          </Field>
          <Privacy checked={f.acceptPrivacy} onChange={(v) => setF({ ...f, acceptPrivacy: v })} />
          <button className="btn btn--primary btn--lg" disabled={reg.busy || !f.acceptPrivacy || !passwordOk(f.password)}>
            {reg.busy ? t.register.creating : t.register.employerSubmit}
          </button>
          {reg.error && <p role="alert" className="error">{reg.error}</p>}
        </form>
        <p className="small muted">
          {t.register.haveAccount} <Link to="/login?tipo=empleador">{t.register.signIn}</Link> · {t.register.lookingForJob}{' '}
          <Link to="/registro/candidato">{t.register.registerAsCandidate}</Link>
        </p>
      </section>
    </RegisterLayout>
  );
}
