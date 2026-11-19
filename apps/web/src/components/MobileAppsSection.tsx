import { useI18n } from '../i18n';
import { SITE } from '../site';

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.6-1-2.6-3.9ZM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4Z" />
  </svg>
);
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
    <path fill="#34d399" d="M3.6 2.3 13.4 12 3.6 21.7c-.4-.2-.6-.6-.6-1.1V3.4c0-.5.2-.9.6-1.1Z" />
    <path fill="#22d3ee" d="m16.6 8.8-3.2 3.2-9.8-9.7c.2-.1.5-.1.8 0l12.2 6.5Z" />
    <path fill="#f472b6" d="m16.6 15.2-12.2 6.5c-.3.1-.6.1-.8 0l9.8-9.7 3.2 3.2Z" />
    <path fill="#fbbf24" d="m20.3 10.8-3.7-2-3.2 3.2 3.2 3.2 3.7-2c.9-.5.9-1.9 0-2.4Z" />
  </svg>
);

/** Descarga de las apps móviles (URLs provisionales en src/site.ts). Va antes del footer. */
export function MobileAppsSection({ onHide }: { onHide?: () => void }) {
  const { t } = useI18n();
  return (
    <section id="apps-moviles" className="apps-section" aria-labelledby="apps-title" data-testid="mobile-apps" tabIndex={-1}>
      <div className="apps-section__inner card aurora">
        {onHide && (
          <button type="button" className="apps-section__close" onClick={onHide} aria-label={t.apps.hide} title={t.apps.hide}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <div className="apps-section__copy">
          <p className="ai-badge">📱 iOS · Android</p>
          <h2 id="apps-title">{t.apps.title}</h2>
          <p className="muted">{t.apps.lead}</p>
          <ul className="apps-section__points">
            {t.apps.points.map((p) => <li key={p}>{p}</li>)}
          </ul>
          <div className="row apps-section__stores" role="group" aria-label={t.apps.aria}>
            <a className="store-btn" href={SITE.apps.ios} target="_blank" rel="noopener noreferrer">
              <AppleIcon />
              <span><small>{t.apps.appStoreTop}</small><strong>{t.apps.appStore}</strong></span>
            </a>
            <a className="store-btn" href={SITE.apps.android} target="_blank" rel="noopener noreferrer">
              <PlayIcon />
              <span><small>{t.apps.playTop}</small><strong>{t.apps.play}</strong></span>
            </a>
          </div>
        </div>
        <div className="phone" aria-hidden="true">
          <div className="phone__notch" />
          <div className="phone__screen">
            <div className="phone__toast">🎉 {t.apps.phoneToast}</div>
            <div className="phone__card">
              <strong>Backend Engineer</strong>
              <span className="phone__ring">87%</span>
              <div className="phone__steps"><i className="on" /><i className="on" /><i className="now" /><i /><i /></div>
              <small>{t.apps.phoneStatus}</small>
            </div>
            <div className="phone__card phone__card--soft"><span /><span /><span /></div>
          </div>
        </div>
      </div>
    </section>
  );
}
