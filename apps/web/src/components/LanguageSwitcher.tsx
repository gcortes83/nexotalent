import { LANGS, useI18n } from '../i18n';

/** Selector de idioma ES | EN (botones con aria-pressed; el nombre de cada idioma en su propio idioma). */
export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t.lang.label}>
      <span className="lang-switch__icon" aria-hidden="true">🌐</span>
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          lang={l.code}
          className={`lang-switch__btn${lang === l.code ? ' lang-switch__btn--active' : ''}`}
          aria-pressed={lang === l.code}
          aria-label={l.name}
          title={t.lang.switchTo(l.name)}
          onClick={() => setLang(l.code)}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
