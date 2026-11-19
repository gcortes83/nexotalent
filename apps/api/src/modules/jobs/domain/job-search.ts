/**
 * Búsqueda y filtrado de vacantes publicadas (función pura).
 * En el MVP se filtra en memoria sobre las vacantes publicadas; en v2 el mismo contrato se resuelve
 * con SQL (índice job_prefilter_idx) + búsqueda semántica en pgvector.
 */
import type { Modality, Seniority } from '../../matching/domain/types.js';
import type { Job } from './job.js';

export const JOB_SORTS = ['recent', 'salary_desc', 'salary_asc', 'positions'] as const;
export type JobSort = (typeof JOB_SORTS)[number];

export interface JobSearchFilters {
  q?: string;
  modality?: Modality[];
  seniority?: Seniority[];
  country?: string[];
  /** Salario mensual mínimo aceptable: la vacante debe ofrecer hasta al menos este monto. */
  minSalary?: number;
  /** La vacante debe pedir TODAS estas skills (por nombre, sin distinguir mayúsculas). */
  skills?: string[];
  /** Solo vacantes urgentes («hot»). */
  urgent?: boolean;
  sort?: JobSort;
  page?: number;
  pageSize?: number;
}

export interface JobFacets {
  modality: Record<string, number>;
  seniority: Record<string, number>;
  country: Record<string, number>;
  skills: { name: string; count: number }[];
  salary: { min: number | null; max: number | null };
  /** Vacantes urgentes dentro del resto de filtros. */
  urgent: number;
}

export interface JobSearchResult {
  jobs: Job[];
  total: number;
  page: number;
  pageSize: number;
  facets: JobFacets;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;
const SENIORITY_ORDER: Seniority[] = ['junior', 'mid', 'senior', 'lead'];

const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

const haystack = (j: Job) => normalize(`${j.title} ${j.description} ${j.organizationName} ${j.city ?? ''} ${j.skills.map((s) => s.name).join(' ')}`);

/** Todas las palabras de la búsqueda deben aparecer (en cualquier orden, sin acentos). */
const matchesText = (j: Job, q: string) => normalize(q).split(/\s+/).filter(Boolean).every((w) => haystack(j).includes(w));

type Facet = 'modality' | 'seniority' | 'country' | 'skills' | 'salary' | 'urgent';

function passes(j: Job, f: JobSearchFilters, skip?: Facet): boolean {
  if (f.q?.trim() && !matchesText(j, f.q)) return false;
  if (skip !== 'modality' && f.modality?.length && !f.modality.includes(j.modality)) return false;
  if (skip !== 'seniority' && f.seniority?.length && !f.seniority.includes(j.seniority)) return false;
  if (skip !== 'country' && f.country?.length && !f.country.includes(j.country)) return false;
  if (skip !== 'urgent' && f.urgent && !j.urgent) return false;
  if (skip !== 'salary' && f.minSalary && (j.salaryMax == null || j.salaryMax < f.minSalary)) return false;
  if (skip !== 'skills' && f.skills?.length) {
    const names = new Set(j.skills.map((s) => normalize(s.name)));
    if (!f.skills.every((s) => names.has(normalize(s)))) return false;
  }
  return true;
}

const count = (values: string[]) => values.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {});

const SORTERS: Record<JobSort, (a: Job, b: Job) => number> = {
  recent: (a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0) || a.title.localeCompare(b.title),
  salary_desc: (a, b) => (b.salaryMax ?? -1) - (a.salaryMax ?? -1) || a.title.localeCompare(b.title),
  salary_asc: (a, b) => (a.salaryMax ?? Infinity) - (b.salaryMax ?? Infinity) || a.title.localeCompare(b.title),
  positions: (a, b) => (b.positionsTotal - b.positionsFilled) - (a.positionsTotal - a.positionsFilled) || a.title.localeCompare(b.title),
};

/**
 * Filtra, ordena y pagina. Las facetas (conteos por opción) se calculan "excluyendo su propio filtro",
 * para que el usuario vea cuántas vacantes obtendría al marcar otra opción del mismo grupo.
 */
export function searchJobs(published: Job[], f: JobSearchFilters): JobSearchResult {
  const pageSize = Math.min(Math.max(f.pageSize ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const matching = published.filter((j) => passes(j, f)).sort(SORTERS[f.sort ?? 'recent']);
  const pages = Math.max(1, Math.ceil(matching.length / pageSize));
  const page = Math.min(Math.max(f.page ?? 1, 1), pages);

  const facetBase = (skip: Facet) => published.filter((j) => passes(j, f, skip));
  const skillCounts = count(facetBase('skills').flatMap((j) => j.skills.map((s) => s.name)));
  const salaries = facetBase('salary').map((j) => j.salaryMax).filter((v): v is number => v != null);
  const seniority = count(facetBase('seniority').map((j) => j.seniority));

  return {
    jobs: matching.slice((page - 1) * pageSize, page * pageSize),
    total: matching.length,
    page,
    pageSize,
    facets: {
      modality: count(facetBase('modality').map((j) => j.modality)),
      seniority: Object.fromEntries(SENIORITY_ORDER.filter((s) => seniority[s]).map((s) => [s, seniority[s]!])),
      country: count(facetBase('country').map((j) => j.country)),
      skills: Object.entries(skillCounts)
        .map(([name, n]) => ({ name, count: n }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, 20),
      salary: { min: salaries.length ? Math.min(...salaries) : null, max: salaries.length ? Math.max(...salaries) : null },
      urgent: facetBase('urgent').filter((j) => j.urgent).length,
    },
  };
}
