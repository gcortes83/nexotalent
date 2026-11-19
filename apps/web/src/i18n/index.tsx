/**
 * Internacionalización ES/EN sin dependencias.
 * - Español por defecto; la elección se guarda en localStorage (`nexo.lang`) y `?lang=en|es` la fuerza.
 * - `useI18n()` devuelve el diccionario tipado (`t.jobs.title`, `t.jobs.page(1, 3)`), el idioma y `setLang`.
 * - `currentDict()` sirve a código fuera de React (p. ej. mensajes de error del cliente HTTP).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en } from './en';
import { es, type Dict } from './es';

export type Lang = 'es' | 'en';
export const LANGS: { code: Lang; name: string; short: string }[] = [
  { code: 'es', name: 'Español', short: 'ES' },
  { code: 'en', name: 'English', short: 'EN' },
];
const DICTS: Record<Lang, Dict> = { es, en };
const STORAGE_KEY = 'nexo.lang';

const isLang = (v: unknown): v is Lang => v === 'es' || v === 'en';

export function initialLang(): Lang {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (isLang(fromUrl)) return fromUrl;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch {
    /* almacenamiento bloqueado */
  }
  return 'es';
}

let active: Dict = es;
/** Diccionario activo para código fuera de React. */
export const currentDict = (): Dict => active;

interface I18n {
  lang: Lang;
  t: Dict;
  setLang: (l: Lang) => void;
}
const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children, lang: forced }: { children: ReactNode; lang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(() => forced ?? initialLang());
  active = DICTS[lang];

  useEffect(() => {
    document.documentElement.lang = DICTS[lang].locale;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* almacenamiento bloqueado */
    }
    active = DICTS[l];
    setLangState(l);
  }, []);

  const value = useMemo(() => ({ lang, t: DICTS[lang], setLang }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Sin provider (componentes aislados, p. ej. en pruebas) se usa el idioma por defecto: español. */
const FALLBACK: I18n = { lang: 'es', t: es, setLang: () => undefined };

export function useI18n(): I18n {
  return useContext(I18nContext) ?? FALLBACK;
}

export type { Dict };
