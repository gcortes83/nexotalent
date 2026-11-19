/**
 * Pruebas unitarias de casos de uso (application/) con adaptadores en memoria y reloj fijo.
 * Cubren ramas de error que los flujos HTTP no ejercitan.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyToJob,
  candidateDashboard,
  changeApplicationStatus,
  employerDashboard,
  listJobApplications,
  withdrawApplication,
} from '../../src/modules/applications/application/applications.js';
import { confirmSkills, getMyProfile, submitResume } from '../../src/modules/candidates/application/resume.js';
import { getPublishedJob, listPublishedJobs } from '../../src/modules/jobs/application/jobs.js';
import { createMemoryDeps } from '../../src/infra/memory/memory-adapters.js';
import type { Deps } from '../../src/ports.js';
import { buildSeed } from '../../src/seed/seed-data.js';
import { fixedClock } from '../../src/shared/clock.js';
import { NOW } from '../support/app.js';

let deps: Deps;
beforeEach(() => {
  const clock = fixedClock(NOW);
  deps = createMemoryDeps(buildSeed(clock.now()), clock);
});

const user = async (email: string) => (await deps.users.getByEmail(email))!;

describe('jobs', () => {
  it('busca por título, descripción o skill sin distinguir mayúsculas', async () => {
    expect((await listPublishedJobs(deps, '  PYTHON ')).map((j) => j.id)).toEqual(
      expect.arrayContaining(['job_data_scientist', 'job_bi_retail']),
    );
    expect(await listPublishedJobs(deps, 'cobol')).toEqual([]);
    expect((await listPublishedJobs(deps)).some((j) => j.id === 'job_draft')).toBe(false);
  });

  it('el detalle expone salario y posiciones disponibles; borrador → 404', async () => {
    const job = await getPublishedJob(deps, 'job_backend_node');
    expect(job.salary).toMatchObject({ min: 4100, max: 5500, currency: 'USD' });
    expect(job.positionsAvailable).toBe(2);
    await expect(getPublishedJob(deps, 'job_draft')).rejects.toMatchObject({ status: 404 });
  });
});

describe('resume', () => {
  it('rechaza CV demasiado corto', async () => {
    const sofia = await user('nueva@example.com');
    await expect(submitResume(deps, sofia.id, '  corto  ')).rejects.toMatchObject({ status: 422 });
  });

  it('no vuelve a proponer skills ya confirmadas', async () => {
    const ana = await user('candidata@example.com');
    const { proposedSkills, confirmedSkills } = await submitResume(
      deps,
      ana.id,
      'Experiencia avanzada en TypeScript, React y Kubernetes en proyectos de comercio electrónico.',
    );
    const confirmedIds = new Set(confirmedSkills.map((s) => s.skillId));
    expect(proposedSkills.every((s) => !confirmedIds.has(s.skillId))).toBe(true);
  });

  it('confirmSkills valida skills desconocidas y duplicadas', async () => {
    const sofia = await user('nueva@example.com');
    await expect(confirmSkills(deps, sofia.id, [{ skillId: 'sk_cobol', level: 3 }])).rejects.toMatchObject({ status: 422 });
    await expect(
      confirmSkills(deps, sofia.id, [
        { skillId: 'sk_typescript', level: 3 },
        { skillId: 'sk_typescript', level: 4 },
      ]),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('el perfil no expone embedding ni texto del CV', async () => {
    const ana = await user('candidata@example.com');
    const profile = await getMyProfile(deps, ana.id);
    expect(profile).not.toHaveProperty('embedding');
    expect(profile).not.toHaveProperty('resumeText');
    expect(profile).toHaveProperty('hasResume');
  });

  it('un reclutador no tiene perfil de candidato', async () => {
    const rec = await user('reclutador@example.com');
    await expect(getMyProfile(deps, rec.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe('applications', () => {
  it('no se puede postular a una vacante en borrador ni dos veces a la misma', async () => {
    const ana = await user('candidata@example.com');
    await expect(applyToJob(deps, ana.id, 'job_draft')).rejects.toMatchObject({ status: 404 });
    await expect(applyToJob(deps, ana.id, 'job_frontend_react')).rejects.toMatchObject({ status: 409 });
  });

  it('retirar: solo el dueño y solo desde estados no terminales', async () => {
    const ana = await user('candidata@example.com');
    const luis = await user('candidato@example.com');
    await expect(withdrawApplication(deps, luis.id, 'app_ana_platform')).rejects.toMatchObject({ status: 404 });

    const withdrawn = await withdrawApplication(deps, ana.id, 'app_ana_platform');
    expect(withdrawn.status).toBe('withdrawn');
    await expect(withdrawApplication(deps, ana.id, 'app_ana_platform')).rejects.toMatchObject({ status: 409 });
  });

  it('el dashboard del candidato incluye postulaciones a vacantes ya cubiertas (filled)', async () => {
    const clock = fixedClock(NOW);
    const seed = buildSeed(clock.now());
    seed.jobs = seed.jobs.map((j) => (j.id === 'job_platform' ? { ...j, status: 'filled' as const } : j));
    deps = createMemoryDeps(seed, clock);
    const ana = await user('candidata@example.com');

    const dash = await candidateDashboard(deps, ana.id);
    const app = dash.applications.find((a) => a.id === 'app_ana_platform');
    expect(app?.job).toMatchObject({ id: 'job_platform', status: 'filled' });
    expect(dash.recommendedJobs.some((j) => j.id === 'job_platform')).toBe(false);
  });

  it('sin skills confirmadas no hay vacantes recomendadas', async () => {
    const sofia = await user('nueva@example.com');
    const dash = await candidateDashboard(deps, sofia.id);
    expect(dash.candidate.hasConfirmedSkills).toBe(false);
    expect(dash.recommendedJobs).toEqual([]);
  });

  it('las funciones del empleador rechazan a candidatos (403)', async () => {
    const ana = await user('candidata@example.com');
    await expect(employerDashboard(deps, ana)).rejects.toMatchObject({ status: 403 });
    await expect(listJobApplications(deps, ana, 'job_backend_node')).rejects.toMatchObject({ status: 403 });
    await expect(
      changeApplicationStatus(deps, ana, { applicationId: 'app_ana_platform', to: 'in_review', expectedVersion: 1, reason: null }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('el reclutador de otra organización recibe 404 (no filtra existencia)', async () => {
    const retail = await user('reclutadora@example.com');
    await expect(listJobApplications(deps, retail, 'job_backend_node')).rejects.toMatchObject({ status: 404 });
    await expect(
      changeApplicationStatus(deps, retail, { applicationId: 'app_ana_platform', to: 'in_review', expectedVersion: 1, reason: null }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
