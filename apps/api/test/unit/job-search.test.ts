import { describe, expect, it } from 'vitest';
import { searchJobs } from '../../src/modules/jobs/domain/job-search.js';
import { buildSeed, SEED_PUBLISHED_JOBS } from '../../src/seed/seed-data.js';
import { NOW } from '../support/app.js';

const catalog = buildSeed(new Date(NOW)).jobs.filter((j) => j.status === 'published');
// Las reglas se prueban sobre las 8 vacantes del núcleo (Fintech y Retail), cuyos datos son estables.
const published = catalog.filter((j) => ['org_fintech', 'org_retail'].includes(j.organizationId));
const ids = (r: ReturnType<typeof searchJobs>) => r.jobs.map((j) => j.id);

describe('catálogo sembrado', () => {
  it('tiene 100 vacantes publicadas en 8 empresas y 6 países, 18 urgentes', () => {
    const r = searchJobs(catalog, {});
    expect(r.total).toBe(SEED_PUBLISHED_JOBS);
    expect(new Set(catalog.map((j) => j.organizationId)).size).toBe(8);
    expect(new Set(catalog.map((j) => j.id)).size).toBe(100);
    expect(r.facets.country).toEqual({ MX: 62, CO: 10, AR: 7, CL: 7, PE: 7, ES: 7 });
    expect(r.facets.modality).toEqual({ remote: 38, hybrid: 33, onsite: 29 });
    expect(r.facets.urgent).toBe(18);
    expect(r.jobs).toHaveLength(20); // pageSize por defecto
    expect(catalog.every((j) => j.currency === 'USD' && j.salaryMin! <= j.salaryMax!)).toBe(true);
  });

  it('filtra urgentes y su faceta respeta el resto de filtros', () => {
    const r = searchJobs(catalog, { urgent: true, pageSize: 50 });
    expect(r.total).toBe(18);
    expect(r.jobs.every((j) => j.urgent)).toBe(true);
    expect(searchJobs(catalog, { modality: ['remote'] }).facets.urgent).toBe(8);
  });
});

describe('searchJobs', () => {
  it('sin filtros devuelve todas las publicadas con total y facetas', () => {
    const r = searchJobs(published, {});
    expect(r.total).toBe(8);
    expect(r.facets.modality).toEqual({ remote: 4, hybrid: 3, onsite: 1 });
    expect(Object.keys(r.facets.seniority)).toEqual(['junior', 'mid', 'senior', 'lead']);
    expect(r.facets.country).toEqual({ MX: 7, CO: 1 });
    expect(r.facets.salary).toEqual({ min: 2000, max: 8000 }); // USD mensuales
  });

  it('texto: todas las palabras, sin acentos ni mayúsculas, en título, empresa o skills', () => {
    expect(ids(searchJobs(published, { q: 'PYTHON retail' }))).toEqual(['job_bi_retail']);
    expect(ids(searchJobs(published, { q: 'lider ecommerce' }))).toEqual([]);
    expect(ids(searchJobs(published, { q: 'Liderazgo E-commerce' }))).toEqual(['job_lead_retail']);
  });

  it('combina modalidad, seniority, país, salario mínimo y skills (todas requeridas)', () => {
    expect(ids(searchJobs(published, { modality: ['remote'], seniority: ['senior'] })).sort()).toEqual(['job_backend_node', 'job_data_scientist', 'job_platform']);
    expect(ids(searchJobs(published, { country: ['CO'] }))).toEqual(['job_fullstack_retail']);
    expect(ids(searchJobs(published, { minSalary: 6500 })).sort()).toEqual(['job_lead_retail', 'job_platform']);
    expect(ids(searchJobs(published, { skills: ['react', 'Node.js'] }))).toEqual(['job_fullstack_retail']);
  });

  it('las facetas excluyen su propio filtro (muestran alternativas del mismo grupo)', () => {
    const r = searchJobs(published, { modality: ['onsite'] });
    expect(r.total).toBe(1);
    expect(r.facets.modality).toEqual({ remote: 4, hybrid: 3, onsite: 1 });
    expect(r.facets.seniority).toEqual({ mid: 1 });
  });

  it('ordena por salario y por posiciones disponibles', () => {
    expect(ids(searchJobs(published, { sort: 'salary_desc' }))[0]).toBe('job_lead_retail');
    expect(ids(searchJobs(published, { sort: 'salary_asc' }))[0]).toBe('job_bi_retail');
    expect(ids(searchJobs(published, { sort: 'positions' }))[0]).toBe('job_java_retail');
  });

  it('pagina y ajusta páginas fuera de rango', () => {
    const p2 = searchJobs(published, { pageSize: 3, page: 2 });
    expect(p2).toMatchObject({ total: 8, page: 2, pageSize: 3 });
    expect(p2.jobs).toHaveLength(3);
    expect(searchJobs(published, { pageSize: 3, page: 99 }).page).toBe(3);
    expect(searchJobs(published, { pageSize: 500 }).pageSize).toBe(50);
  });
});
