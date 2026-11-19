import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api } from '../api/client';
import type { Job, JobSearchParams, JobSort, Modality, Seniority } from '../api/types';
import { descriptionExcerpt } from '../components/JobDescription';
import { formatMoney } from '../components/labels';
import { type Dict, useI18n } from '../i18n';
import { FlameIcon, UrgentBadge } from '../components/UrgentBadge';

const SALARY_STEPS = [1500, 2500, 4000, 6000];
const PAGE_SIZE = 10;
const MODALITIES: Modality[] = ['remote', 'hybrid', 'onsite'];
const SENIORITIES: Seniority[] = ['junior', 'mid', 'senior', 'lead'];

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);
/** «Publicada hace 3 días» / «Posted 3 days ago» en el idioma activo. */
export function publishedAgo(iso: string | null, t: Dict, now = Date.now()): string {
  if (!iso) return '';
  const rtf = new Intl.RelativeTimeFormat(t.locale, { numeric: 'auto' });
  const days = Math.round((new Date(iso).getTime() - now) / 86_400_000);
  if (days > -1) return t.jobs.publishedToday;
  if (days > -30) return t.jobs.published(rtf.format(days, 'day'));
  return t.jobs.published(rtf.format(Math.round(days / 30), 'month'));
}
const salaryText = (j: Job, t: Dict) => {
  if (!j.salary) return t.jobs.noSalary;
  const { min, max, currency } = j.salary;
  return min ? `${formatMoney(min, currency)} – ${formatMoney(max, currency)}` : t.jobs.upTo(formatMoney(max, currency));
};
const initials = (name: string) => name.split(/\s+/).filter((w) => /^[A-ZÁÉÍÓÚÑ]/.test(w)).slice(0, 2).map((w) => w[0]).join('') || name[0]!;

/** Búsqueda de vacantes en lista con filtros facetados; el estado vive en la URL (compartible). */
/** Última vacante seleccionada: se recuerda en la pestaña para resaltarla al volver a la lista. */
const SELECTED_KEY = 'nexo.lastJob';
const readSelected = () => {
  try { return sessionStorage.getItem(SELECTED_KEY); } catch { return null; }
};

export function JobsPage() {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(readSelected);
  const selectJob = (id: string) => {
    setSelectedId(id);
    try { sessionStorage.setItem(SELECTED_KEY, id); } catch { /* almacenamiento bloqueado */ }
  };
  const [params, setParams] = useSearchParams();
  const filters: JobSearchParams = useMemo(() => ({
    q: params.get('q') ?? undefined,
    modality: list(params.get('modality')) as Modality[],
    seniority: list(params.get('seniority')) as Seniority[],
    country: list(params.get('country')),
    skills: list(params.get('skills')),
    minSalary: params.get('minSalary') ? Number(params.get('minSalary')) : undefined,
    urgent: params.get('urgent') === 'true' ? true : undefined,
    sort: (params.get('sort') as JobSort | null) ?? undefined,
    page: params.get('page') ? Number(params.get('page')) : undefined,
    pageSize: PAGE_SIZE,
  }), [params]);

  const [q, setQ] = useState(filters.q ?? '');
  // En pantallas angostas el panel de filtros empieza plegado para mostrar primero los resultados.
  const [filtersOpen] = useState(() => typeof window.matchMedia !== 'function' || !window.matchMedia('(max-width: 860px)').matches);
  useEffect(() => setQ(filters.q ?? ''), [filters.q]);

  const result = useQuery({ queryKey: ['jobs', 'search', filters], queryFn: () => api.searchJobs(filters), placeholderData: keepPreviousData });
  const data = result.data;
  const facets = data?.facets;
  const total = data?.total ?? data?.items.length ?? 0;
  const pageSize = data?.pageSize ?? PAGE_SIZE;
  const page = data?.page ?? 1;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  /** Cambia filtros en la URL; cualquier cambio de filtro vuelve a la página 1. */
  const update = (patch: Record<string, string | string[] | undefined>, keepPage = false) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      const value = Array.isArray(v) ? v.join(',') : v;
      if (value) next.set(k, value);
      else next.delete(k);
    }
    if (!keepPage) next.delete('page');
    setParams(next, { replace: false });
  };
  const toggle = (key: 'modality' | 'seniority' | 'country' | 'skills', value: string) => {
    const current = (filters[key] ?? []) as string[];
    update({ [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] });
  };
  const submit = (e: FormEvent) => { e.preventDefault(); update({ q: q.trim() || undefined }); };

  const chips: { label: string; remove: () => void }[] = [
    ...(filters.q ? [{ label: `“${filters.q}”`, remove: () => update({ q: undefined }) }] : []),
    ...(filters.urgent ? [{ label: t.urgent.chip, remove: () => update({ urgent: undefined }) }] : []),
    ...(filters.modality ?? []).map((m) => ({ label: t.modality[m], remove: () => toggle('modality', m) })),
    ...(filters.seniority ?? []).map((s) => ({ label: t.seniority[s] ?? s, remove: () => toggle('seniority', s) })),
    ...(filters.country ?? []).map((c) => ({ label: t.countries[c] ?? c, remove: () => toggle('country', c) })),
    ...(filters.skills ?? []).map((s) => ({ label: s, remove: () => toggle('skills', s) })),
    ...(filters.minSalary ? [{ label: t.jobs.from(formatMoney(filters.minSalary)), remove: () => update({ minSalary: undefined }) }] : []),
  ];
  const clearAll = () => setParams(filters.sort ? { sort: filters.sort } : {});

  const facetOptions = <T extends string>(group: 'modality' | 'seniority' | 'country', values: T[], labels: Record<string, string>) =>
    values.map((v) => {
      const n = (facets?.[group] as Record<string, number> | undefined)?.[v] ?? 0;
      const checked = ((filters[group] ?? []) as string[]).includes(v);
      return (
        <label key={v} className={`facet${n === 0 && !checked ? ' facet--empty' : ''}`}>
          <input type="checkbox" checked={checked} onChange={() => toggle(group, v)} disabled={n === 0 && !checked} />
          <span>{labels[v] ?? v}</span>
          <span className="facet__count" aria-label={t.jobs.jobsCount(n)}>{n}</span>
        </label>
      );
    });

  const filterPanel = (
    <>
      <label className={`facet urgent-toggle${filters.urgent ? ' urgent-toggle--on' : ''}`}>
        <input type="checkbox" checked={!!filters.urgent} onChange={() => update({ urgent: filters.urgent ? undefined : 'true' })} />
        <span className="row"><FlameIcon size={16} /><span>{t.urgent.filter}</span></span>
        <span className="facet__count" aria-label={t.jobs.jobsCount(facets?.urgent ?? 0)}>{facets?.urgent ?? 0}</span>
      </label>
      <FilterGroup title={t.jobs.modality}>{facetOptions('modality', MODALITIES, t.modality)}</FilterGroup>
      <FilterGroup title={t.jobs.seniority}>{facetOptions('seniority', SENIORITIES, t.seniority)}</FilterGroup>
      <FilterGroup title={t.jobs.country}>{facetOptions('country', Object.keys(facets?.country ?? {}).concat((filters.country ?? []).filter((c) => !facets?.country[c])), t.countries)}</FilterGroup>
      <FilterGroup title={t.jobs.salary}>
        <label className="facet"><input type="radio" name="minSalary" checked={!filters.minSalary} onChange={() => update({ minSalary: undefined })} /><span>{t.jobs.any}</span></label>
        {SALARY_STEPS.map((s) => (
          <label key={s} className="facet">
            <input type="radio" name="minSalary" checked={filters.minSalary === s} onChange={() => update({ minSalary: String(s) })} />
            <span>{t.jobs.from(formatMoney(s))}</span>
          </label>
        ))}
      </FilterGroup>
      <FilterGroup title={t.jobs.skills}>
        <div className="skill-facets">
          {(facets?.skills ?? []).map((s) => {
            const active = filters.skills?.includes(s.name);
            return (
              <button key={s.name} type="button" className={`chip chip--button${active ? ' chip--active' : ''}`} aria-pressed={!!active} onClick={() => toggle('skills', s.name)}>
                {s.name} <span className="muted">{s.count}</span>
              </button>
            );
          })}
        </div>
      </FilterGroup>
      {chips.length > 0 && <button type="button" className="btn btn--ghost small" onClick={clearAll}>{t.jobs.clearFilters}</button>}
    </>
  );

  return (
    <section className="jobs-page">
      <header className="jobs-hero">
        <h1>{t.jobs.title}</h1>
        <p className="muted">{t.jobs.lead}</p>
        {/* Buscador a todo el ancho de la página (90 % de la ventana); se envía con el ícono o con Enter. */}
        <form role="search" onSubmit={submit} className="search-bar search-bar--wide">
          <label className="sr-only" htmlFor="q">{t.jobs.searchLabel}</label>
          <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.jobs.searchPlaceholder} maxLength={100} />
          <button className="search-bar__submit" aria-label={t.jobs.search} title={t.jobs.search}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
              <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
              <path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </button>
        </form>
      </header>

      <div className="jobs-layout">
        <aside className="filters-panel card" aria-label={t.jobs.filters}>
          <details className="filters-panel__mobile" open={filtersOpen}>
            <summary><span>{t.jobs.filters}</span>{chips.length > 0 && <span className="badge">{chips.length}</span>}</summary>
            {filterPanel}
          </details>
        </aside>

        <div className="jobs-results">
          <div className="results-bar">
            <p className="results-count" aria-live="polite">
              {result.isLoading ? t.jobs.searching : <><strong>{total}</strong> {t.jobs.count(total)}</>}
            </p>
            <label className="row small">{t.jobs.sortBy}
              <select value={filters.sort ?? 'recent'} onChange={(e) => update({ sort: e.target.value === 'recent' ? undefined : e.target.value })}>
                {(Object.keys(t.jobs.sorts) as JobSort[]).map((s) => <option key={s} value={s}>{t.jobs.sorts[s]}</option>)}
              </select>
            </label>
          </div>

          {chips.length > 0 && (
            <ul className="active-filters" aria-label={t.jobs.activeFilters}>
              {chips.map((c) => (
                <li key={c.label}><button type="button" className="chip chip--active chip--button" onClick={c.remove} aria-label={t.jobs.removeFilter(c.label)}>{c.label} ✕</button></li>
              ))}
              <li><button type="button" className="btn btn--ghost small" onClick={clearAll}>{t.jobs.clearAll}</button></li>
            </ul>
          )}

          {result.isError && <p role="alert" className="error">{t.jobs.loadError}</p>}
          {data && data.items.length === 0 && (
            <div className="card empty">
              <p className="muted">{filters.q ? t.jobs.noResultsFor(filters.q) : t.jobs.noResults}</p>
              {chips.length > 0 && <button type="button" className="btn" onClick={clearAll}>{t.jobs.removeFilters}</button>}
            </div>
          )}

          <ul className={`job-list${result.isFetching && !result.isLoading ? ' job-list--loading' : ''}`}>
            {data?.items.map((j) => <JobRow key={j.id} job={j} activeSkills={filters.skills ?? []} selected={selectedId === j.id} onSelect={selectJob} />)}
          </ul>

          {pages > 1 && (
            <nav className="pagination" aria-label={t.jobs.pagination}>
              <button className="btn small" disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, true)}>{t.jobs.prev}</button>
              <span className="small muted">{t.jobs.page(page, pages)}</span>
              <button className="btn small" disabled={page >= pages} onClick={() => update({ page: String(page + 1) }, true)}>{t.jobs.next}</button>
            </nav>
          )}
        </div>
      </div>
    </section>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="filter-group">
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}

/**
 * Fila de vacante: toda la tarjeta abre el detalle (donde se ve el match y se postula).
 * El título y el botón siguen siendo enlaces reales para teclado y lectores de pantalla.
 */
function JobRow({ job: j, activeSkills, selected, onSelect }: { job: Job; activeSkills: string[]; selected: boolean; onSelect: (id: string) => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const href = `/jobs/${j.id}`;
  const location = [j.city, t.countries[j.country] ?? j.country].filter(Boolean).join(', ');
  const open = (e: React.MouseEvent) => {
    onSelect(j.id);
    if ((e.target as HTMLElement).closest('a, button, input, select, label')) return; // ya navega o es otro control
    if (window.getSelection()?.toString()) return; // permite seleccionar texto
    navigate(href);
  };
  return (
    <li className={`job-row card job-row--clickable${j.urgent ? ' job-row--urgent' : ''}${selected ? ' job-row--selected' : ''}`}
      onClick={open} onFocus={() => onSelect(j.id)} data-testid="job-row" data-selected={selected || undefined}>
      <div className="job-row__logo" aria-hidden>{initials(j.organizationName)}</div>
      <div className="job-row__main">
        <h2 className="job-row__title"><Link to={href}>{j.title}</Link>{j.urgent && <UrgentBadge />}</h2>
        <p className="job-row__meta muted">
          <span>{j.organizationName}</span>
          <span>📍 {location}</span>
          <span className={`badge badge--${j.modality}`}>{t.modality[j.modality]}</span>
          <span className="badge">{t.seniority[j.seniority] ?? j.seniority}</span>
        </p>
        {descriptionExcerpt(j.description) && <p className="job-row__excerpt">{descriptionExcerpt(j.description)}</p>}
        <ul className="chips" aria-label={t.jobs.requiredSkills}>
          {[...j.skills.filter((s) => s.category !== 'Soft skills'), ...j.skills.filter((s) => s.category === 'Soft skills')].slice(0, 6).map((s) => (
            <li key={s.name} className={`chip${s.mustHave ? ' chip--must' : ''}${s.category === 'Soft skills' ? ' chip--soft' : ''}${activeSkills.includes(s.name) ? ' chip--active' : ''}`}
              title={s.mustHave ? t.jobs.mandatory : undefined}>
              {s.mustHave && <span aria-label={t.jobs.mandatory}>★ </span>}{s.name}
            </li>
          ))}
          {j.skills.length > 6 && <li className="chip muted">+{j.skills.length - 6}</li>}
        </ul>
        <p className="small muted">
          {t.jobs.positions(j.positionsAvailable, j.positionsTotal)} · {t.jobs.applicants(j.applicantsCount)} · {publishedAgo(j.publishedAt, t)}
        </p>
      </div>
      <div className="job-row__side">
        <p className="job-row__salary">{salaryText(j, t)}<small className="muted"> {t.common.perMonth}</small></p>
        <Link className="btn btn--primary small" to={href} aria-label={t.jobs.seeDetailOf(j.title)}>{t.jobs.seeDetail}</Link>
      </div>
    </li>
  );
}
