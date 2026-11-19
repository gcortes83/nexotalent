import { Link } from 'react-router';
import { useI18n } from '../i18n';
import { SITE } from '../site';
import { LanguageSwitcher } from './LanguageSwitcher';

/** Footer global con datos del sitio y de la compañía (placeholders en src/site.ts) y selector de idioma. */
export function SiteFooter({ onShowApps }: { onShowApps?: () => void }) {
  const { t } = useI18n();
  const year = new Date().getFullYear();
  const { company, links } = SITE;
  return (
    <footer className="site-footer" aria-labelledby="footer-title">
      <div className="site-footer__inner">
        <section className="site-footer__brand">
          <h2 id="footer-title" className="brand">Nexo<span className="gradient-text">Talent</span> ✦</h2>
          <p className="muted small">{t.footer.tagline}</p>
          <ul className="site-footer__social" aria-label={t.footer.social}>
            {links.social.map((s) => (
              <li key={s.label}><a href={s.href} aria-label={s.label} title={s.label}><span aria-hidden>{s.icon}</span></a></li>
            ))}
          </ul>
          {/* Opción para volver a mostrar la sección de apps móviles cuando se ocultó. */}
          {onShowApps && (
            <button type="button" className="btn small footer-apps-btn" onClick={onShowApps}>📱 {t.apps.show}</button>
          )}
        </section>

        <nav aria-label={t.footer.product}>
          <h3>{t.footer.product}</h3>
          <ul>{links.product.map((l) => <li key={l.key}><Link to={l.to}>{t.footer.links[l.key]}</Link></li>)}</ul>
        </nav>
        <nav aria-label={t.footer.company}>
          <h3>{t.footer.company}</h3>
          <ul>{links.company.map((l) => <li key={l.key}><a href={l.href}>{t.footer.links[l.key]}</a></li>)}</ul>
        </nav>
        <nav aria-label={t.footer.legal}>
          <h3>{t.footer.legal}</h3>
          <ul>{links.legal.map((l) => <li key={l.key}><a href={l.href}>{t.footer.links[l.key]}</a></li>)}</ul>
        </nav>

        <section aria-label={t.footer.contact}>
          <h3>{t.footer.contact}</h3>
          <address className="small muted">
            {company.legalName}<br />
            {t.footer.taxId}: {company.taxId}<br />
            {company.address}<br />
            <a href={`mailto:${company.email}`}>{company.email}</a><br />
            <a href={`tel:${company.phone.replace(/\D/g, '')}`}>{company.phone}</a><br />
            {company.supportHours}
          </address>
        </section>
      </div>
      {/* Textos a la izquierda (su largo cambia con el idioma) y el selector fijo a la derecha. */}
      <div className="site-footer__bottom small muted">
        <div className="site-footer__legal">
          <span>© {year} {SITE.name} · {company.legalName}. {t.footer.rights}</span>
          <span>{t.footer.humanDecision}</span>
        </div>
        <div className="site-footer__lang"><LanguageSwitcher /></div>
      </div>
    </footer>
  );
}
