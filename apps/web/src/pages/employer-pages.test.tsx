import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { JobApplicant } from '../api/types';
import { fakeApi } from '../test/fake-api';
import { job, ruben } from '../test/fixtures';
import { renderAt } from '../test/render';

const applicant = (over: Partial<JobApplicant> = {}): JobApplicant => ({
  id: 'app_ana', jobId: 'job_backend_node', candidateId: 'cand_ana', status: 'in_review', version: 2, matchScore: 0.82,
  createdAt: '2026-11-10T12:00:00.000Z', statusChangedAt: '2026-11-13T12:00:00.000Z', staleDays: 4,
  candidate: { id: 'cand_ana', fullName: 'Ana Ejemplo', headline: 'Backend', seniority: 'senior' }, ...over,
});

describe('dashboard del empleador', () => {
  it('lista vacantes con posiciones/postulantes y estancadas 3/5 días', async () => {
    fakeApi({
      'GET /v1/me': () => ({ body: ruben }),
      'GET /v1/bff/employer/dashboard': () => ({
        body: {
          jobs: [{ ...job, applicantsCount: 3, positionsAvailable: 1, pipeline: { submitted: 1, in_review: 1 } }],
          staleApplications: [
            { applicationId: 'a1', jobId: 'job_backend_node', jobTitle: 'Backend Engineer Node.js', status: 'in_review', version: 2, staleDays: 6, level: 'escalated' },
            { applicationId: 'a2', jobId: 'job_backend_node', jobTitle: 'Backend Engineer Node.js', status: 'submitted', version: 1, staleDays: 3, level: 'warning' },
          ],
        },
      }),
    });
    renderAt('/e/dashboard', { token: 'tkn' });
    expect(await screen.findByText('6 días · urgente')).toHaveClass('badge--negative');
    expect(screen.getByText('3 días')).toHaveClass('badge--warning');
    const row = screen.getByRole('rowheader', { name: /Backend Engineer/ }).closest('tr')!;
    expect(within(row).getByText('1/2 cubiertas')).toBeInTheDocument();
    expect(within(row).getByText('3')).toBeInTheDocument();
  });

  it('un candidato no puede entrar al área de empleador', async () => {
    fakeApi({ 'GET /v1/me': () => ({ body: { ...ruben, role: 'candidate', organizationId: null } }), 'GET /v1/bff/candidate/dashboard': () => ({ body: { candidate: { id: 'c', fullName: 'X Y', hasConfirmedSkills: true }, summary: { total: 0, active: 0 }, applications: [], recommendedJobs: [] } }) });
    const { router } = renderAt('/e/dashboard', { token: 'tkn' });
    await waitFor(() => expect(router.state.location.pathname).toBe('/c/dashboard'));
  });
});

describe('candidatos de la vacante y cambio de estatus', () => {
  it('muestra solo las transiciones válidas y envía If-Match con la versión', async () => {
    let version = 2;
    const { calls } = fakeApi({
      'GET /v1/me': () => ({ body: ruben }),
      'GET /v1/jobs/job_backend_node': () => ({ body: job }),
      'GET /v1/jobs/job_backend_node/applications': () => ({ body: { items: [applicant({ version, status: version === 2 ? 'in_review' : 'shortlisted' })] } }),
      'PATCH /v1/applications/app_ana/status': () => {
        version = 3;
        return { body: { id: 'app_ana', status: 'shortlisted', version: 3 } };
      },
      'GET /v1/bff/employer/dashboard': () => ({ body: { jobs: [], staleApplications: [] } }),
    });
    renderAt('/e/jobs/job_backend_node', { token: 'tkn' });

    const group = await screen.findByRole('group', { name: 'Cambiar estatus de Ana Ejemplo' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Preseleccionado', 'No seleccionado']);
    expect(screen.getByText('4 días sin cambio')).toBeInTheDocument();

    await userEvent.click(within(group).getByRole('button', { name: 'Preseleccionado' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Estatus actualizado a “Preseleccionado”');
    const patch = calls.find((c) => c.method === 'PATCH')!;
    expect(patch.headers.get('If-Match')).toBe('"2"');
    expect(patch.body).toEqual({ status: 'shortlisted' });
    await waitFor(() => expect(screen.getByRole('group', { name: /Ana Ejemplo/ })).toHaveTextContent('Entrevista agendada'));
  });

  it('conflicto de versión (412) → mensaje para recargar', async () => {
    fakeApi({
      'GET /v1/me': () => ({ body: ruben }),
      'GET /v1/jobs/job_backend_node': () => ({ body: job }),
      'GET /v1/jobs/job_backend_node/applications': () => ({ body: { items: [applicant()] } }),
      'PATCH /v1/applications/app_ana/status': () => ({ status: 412, body: { title: 'version', status: 412 } }),
    });
    renderAt('/e/jobs/job_backend_node', { token: 'tkn' });
    await userEvent.click(await screen.findByRole('button', { name: 'Preseleccionado' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Recarga/);
  });
});
