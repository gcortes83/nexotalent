import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppNotification, EmployerJob } from '../api/types';
import { fakeApi } from '../test/fake-api';
import { ana, dashboard, job, ruben } from '../test/fixtures';
import { renderAt } from '../test/render';

afterEach(() => vi.restoreAllMocks());

const employerJob = (over: Partial<EmployerJob> = {}): EmployerJob => ({
  ...job, status: 'published', closedAt: null, externalId: null, sourceType: 'manual', updatedAt: '2026-11-17T12:00:00.000Z',
  skills: job.skills.map((s, i) => ({ ...s, skillId: `sk_${i}` })), ...over,
});

describe('login con contraseña (sin ?demo)', () => {
  it('muestra pestañas candidato/empleador y entra como empleador', async () => {
    const { calls } = fakeApi({
      'POST /v1/auth/login': () => ({ body: { token: 'tkn', user: ruben } }),
      'GET /v1/bff/employer/dashboard': () => ({ body: { jobs: [], staleApplications: [] } }),
    });
    const { router } = renderAt('/login');
    expect(screen.queryByRole('list', { name: 'Cuentas de demo' })).not.toBeInTheDocument();

    await userEvent.click(await screen.findByRole('tab', { name: 'Empleador' }));
    expect(screen.getByRole('tab', { name: 'Empleador' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.type(screen.getByLabelText('Correo'), 'reclutador@example.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Demo1234');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar como empleador' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/e/dashboard'));
    expect(calls.find((c) => c.url === '/v1/auth/login')?.body).toEqual({ email: 'reclutador@example.com', password: 'Demo1234', kind: 'employer' });
  });

  it('credenciales inválidas muestran el error de la API', async () => {
    fakeApi({ 'POST /v1/auth/login': () => ({ status: 401, body: { title: 'Correo o contraseña incorrectos.', status: 401 } }) });
    renderAt('/login');
    await userEvent.type(await screen.findByLabelText('Correo'), 'x@example.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Mala1234');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar como candidato' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
  });

  it('?demo=1 muestra las cuentas de demo', async () => {
    fakeApi({});
    renderAt('/login?demo=1');
    expect(await screen.findByRole('list', { name: 'Cuentas de demo' })).toBeInTheDocument();
  });
});

describe('registro', () => {
  it('candidato: valida contraseña y aviso de privacidad, crea la cuenta y lleva al perfil', async () => {
    const { calls } = fakeApi({
      'POST /v1/auth/register/candidate': () => ({ status: 201, body: { token: 'tkn', user: { ...ana, id: 'usr_new' } } }),
      'GET /v1/candidates/me': () => ({ body: { id: 'c', fullName: 'Carla', headline: null, seniority: null, country: 'MX', preferredModalities: [], salaryExpectation: null, skills: [], hasResume: false } }),
    });
    const { router } = renderAt('/registro/candidato');
    await userEvent.type(await screen.findByLabelText('Nombre completo'), 'Carla Registro');
    await userEvent.type(screen.getByLabelText('Correo'), 'carla@example.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'corta');
    const submit = screen.getByRole('button', { name: 'Crear cuenta de candidato' });
    expect(submit).toBeDisabled();

    await userEvent.clear(screen.getByLabelText('Contraseña'));
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Segura123');
    await userEvent.click(screen.getByRole('checkbox', { name: /aviso de privacidad/ }));
    await userEvent.click(submit);

    await waitFor(() => expect(router.state.location.pathname).toBe('/c/profile'));
    expect(calls.find((c) => c.url === '/v1/auth/register/candidate')?.body).toMatchObject({ email: 'carla@example.com', acceptPrivacy: true, country: 'MX' });
    expect(await screen.findByText(/¡Bienvenido!/)).toBeInTheDocument();
  });

  it('empleador: muestra el 409 de correo duplicado', async () => {
    fakeApi({ 'POST /v1/auth/register/employer': () => ({ status: 409, body: { title: 'Ya existe una cuenta con ese correo', status: 409 } }) });
    renderAt('/registro/empleador');
    await userEvent.type(await screen.findByLabelText('Nombre de la empresa'), 'Logística Ejemplo');
    await userEvent.type(screen.getByLabelText('Tu nombre'), 'Elena');
    await userEvent.type(screen.getByLabelText('Correo de trabajo'), 'reclutador@example.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Segura123');
    await userEvent.click(screen.getByRole('checkbox', { name: /aviso de privacidad/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta de empleador' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una cuenta con ese correo');
  });
});

describe('perfil del candidato', () => {
  const profile = { id: 'cand_ana', fullName: 'Ana Ejemplo', headline: 'Frontend', seniority: 'mid', country: 'MX', preferredModalities: ['remote'], salaryExpectation: 3000, skills: [], hasResume: true };

  it('guarda datos, sube el CV como archivo y lista postulaciones con marcas', async () => {
    const closedApp = { ...dashboard().applications[0]!, id: 'app_2', status: 'in_review' as const, job: { id: 'job_x', title: 'Data Engineer', organizationName: 'Retail', status: 'closed' } };
    const { calls } = fakeApi({
      'GET /v1/me': () => ({ body: ana }),
      'GET /v1/candidates/me': () => ({ body: profile }),
      'GET /v1/skills': () => ({ body: [] }),
      'GET /v1/bff/candidate/dashboard': () => ({ body: dashboard({ applications: [dashboard().applications[0]!, closedApp] }) }),
      'PUT /v1/candidates/me': ({ body }) => ({ body: { ...profile, ...(body as object) } }),
      'POST /v1/candidates/me/resume/file': () => ({ body: { proposedSkills: [{ skillId: 'sk_react', name: 'React', category: 'Frameworks', level: 4, confirmed: false, source: 'extracted', evidence: 'React' }], confirmedSkills: [] } }),
    });
    renderAt('/c/profile', { token: 'tkn' });

    const seniority = await screen.findByLabelText('Seniority');
    await userEvent.selectOptions(seniority, 'senior');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar mis datos' }));
    expect(await screen.findByText('Datos actualizados. Tu match se recalculó.')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'PUT')?.body).toMatchObject({ seniority: 'senior', preferredModalities: ['remote'] });

    const file = new File(['%PDF-1.4 cv'], 'cv.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByLabelText(/Sube tu CV/), file);
    expect(await screen.findByText('“React”')).toBeInTheDocument();
    const upload = calls.find((c) => c.url === '/v1/candidates/me/resume/file')!;
    expect(upload.headers.get('Content-Type')).toBe('application/pdf');

    const table = await screen.findByRole('table', { name: 'Mis postulaciones' });
    const selectedRow = within(table).getByRole('rowheader', { name: 'Frontend Engineer React' }).closest('tr')!;
    expect(within(selectedRow).getByText(/Seleccionado/)).toBeInTheDocument();
    const closedRow = within(table).getByRole('rowheader', { name: 'Data Engineer' }).closest('tr')!;
    expect(within(closedRow).getByText('Vacante cerrada')).toBeInTheDocument();
  });
});

describe('toasts de notificaciones', () => {
  it('muestra un toast por cada notificación no leída y la marca como leída', async () => {
    const n: AppNotification = {
      id: 'ntf_1', userId: 'usr_ana', kind: 'selected', title: '¡Fuiste preseleccionado!', body: 'Avanzaste en «Frontend».',
      data: { jobId: 'job_frontend_react' }, readAt: null, createdAt: '2026-11-17T12:00:00.000Z',
    };
    const { calls } = fakeApi({
      'GET /v1/me': () => ({ body: ana }),
      'GET /v1/notifications': () => ({ body: { items: [n], unreadCount: 1 } }),
      'POST /v1/notifications/ntf_1/read': () => ({ status: 204 }),
      'GET /v1/bff/candidate/dashboard': () => ({ body: dashboard() }),
    });
    renderAt('/c/dashboard', { token: 'tkn' });
    const toast = await screen.findByTestId('toast');
    expect(toast).toHaveTextContent('¡Fuiste preseleccionado!');
    expect(within(toast).getByRole('link', { name: 'Ver mis postulaciones' })).toBeInTheDocument();
    await waitFor(() => expect(calls.some((c) => c.url === '/v1/notifications/ntf_1/read')).toBe(true));
    await userEvent.click(within(toast).getByRole('button', { name: 'Cerrar notificación' }));
    expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
  });
});

describe('gestión de vacantes del empleador', () => {
  it('publica un borrador y cierra una vacante (con confirmación) avisando a los candidatos', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const draft = employerJob({ id: 'job_d', title: 'QA Automation', status: 'draft' });
    const { calls } = fakeApi({
      'GET /v1/me': () => ({ body: ruben }),
      'GET /v1/employer/jobs': () => ({ body: { items: [employerJob(), draft] } }),
      'POST /v1/employer/jobs/job_d/publish': () => ({ body: { ...draft, status: 'published' } }),
      'POST /v1/employer/jobs/job_backend_node/close': () => ({ body: { ...employerJob(), status: 'closed', notifiedCandidates: 2 } }),
    });
    renderAt('/e/vacantes', { token: 'tkn' });

    const draftRow = (await screen.findByRole('rowheader', { name: /QA Automation/ })).closest('tr')!;
    await userEvent.click(within(draftRow).getByRole('button', { name: 'Publicar' }));
    expect(await screen.findByText('Vacante publicada')).toBeInTheDocument();

    const row = screen.getByRole('rowheader', { name: /Backend Engineer/ }).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: 'Cerrar vacante' }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('avisaremos a los candidatos'));
    expect(await screen.findByText(/Avisamos a 2 candidato/)).toBeInTheDocument();
    expect(calls.some((c) => c.url === '/v1/employer/jobs/job_backend_node/close')).toBe(true);
  });

  it('crea y publica una vacante con skills', async () => {
    const { calls, fetchMock } = fakeApi({
      'GET /v1/me': () => ({ body: ruben }),
      'GET /v1/skills': () => ({ body: [{ id: 'sk_react', name: 'React', category: 'Frameworks', aliases: [] }, { id: 'sk_empatia', name: 'Empatía', category: 'Soft skills', aliases: [] }] }),
      'POST /v1/employer/jobs': ({ body }) => ({ status: 201, body: employerJob({ title: (body as { title: string }).title }) }),
      'GET /v1/employer/jobs': () => ({ body: { items: [] } }),
    });
    const { router } = renderAt('/e/vacantes/nueva', { token: 'tkn' });
    await userEvent.type(await screen.findByLabelText('Título'), 'Frontend React');
    await userEvent.type(screen.getByLabelText('Descripción'), 'Construir interfaces accesibles.');
    const publish = screen.getByRole('button', { name: 'Publicar vacante' });
    expect(publish).toBeDisabled();
    await waitFor(() => expect(screen.getByRole('option', { name: 'React' })).toBeInTheDocument());
    const technical = screen.getByRole('group', { name: 'Skills requeridas' });
    expect(within(technical).queryByRole('option', { name: 'Empatía' })).not.toBeInTheDocument(); // las soft van aparte
    await userEvent.selectOptions(screen.getByLabelText('Agregar skill requerida'), 'sk_react');
    await userEvent.click(within(technical).getByRole('button', { name: 'Agregar' }));
    const soft = screen.getByRole('group', { name: 'Soft skills (opcional)' });
    await userEvent.selectOptions(within(soft).getByRole('combobox', { name: 'Agregar soft skill' }), 'sk_empatia');
    await userEvent.click(within(soft).getByRole('button', { name: 'Agregar' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Obligatoria' }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Contratación urgente/ }));
    await userEvent.click(publish);

    await waitFor(() => expect(router.state.location.pathname).toBe('/e/vacantes'));
    expect(calls.find((c) => c.method === 'POST' && c.url === '/v1/employer/jobs')?.body).toMatchObject({
      title: 'Frontend React', publish: true, urgent: true, skills: [{ name: 'React', level: 3, mustHave: true }],
      softSkills: [{ name: 'Empatía', level: 3, mustHave: false }],
    });
    expect(fetchMock).toHaveBeenCalled();
  });

  it('importa un CSV y muestra el reporte con errores por fila', async () => {
    const { calls } = fakeApi({
      'GET /v1/me': () => ({ body: ruben }),
      'POST /v1/employer/jobs/imports': () => ({
        body: { format: 'csv', created: 1, updated: 0, items: [{ row: 1, jobId: 'job_i', title: 'Data Engineer', result: 'created', status: 'draft', warnings: ['Skills no reconocidas (omitidas): Fortran'] }], errors: [{ row: 2, message: 'description: Describe la vacante' }] },
      }),
    });
    renderAt('/e/importar', { token: 'tkn' });
    const file = new File(['externalId,title\n'], 'vacantes.csv', { type: 'text/csv' });
    await userEvent.upload(await screen.findByLabelText(/Archivo CSV/), file);
    await userEvent.click(screen.getByRole('button', { name: '⇪ Importar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('1 creadas · 0 actualizadas · 1 con errores');
    expect(screen.getByText(/Fila 2: description/)).toBeInTheDocument();
    expect(screen.getByText(/Fortran/)).toBeInTheDocument();
    const call = calls.find((c) => c.url.startsWith('/v1/employer/jobs/imports'))!;
    expect(call.url).toBe('/v1/employer/jobs/imports?format=csv&publish=false');
    expect(call.headers.get('Content-Type')).toBe('text/csv');
  });
});

describe('soft skills en el perfil del candidato', () => {
  it('se ven en su propia sección (verde), se agregan aparte y se confirman junto con las técnicas', async () => {
    const skill = (skillId: string, name: string, category: string, level: number) => ({ skillId, name, category, level, confirmed: true, source: 'declared', evidence: null });
    const { calls } = fakeApi({
      'GET /v1/me': () => ({ body: ana }),
      'GET /v1/candidates/me': () => ({
        body: { id: 'cand_ana', fullName: 'Ana Ejemplo', headline: null, seniority: 'senior', country: 'MX', preferredModalities: [], salaryExpectation: null, hasResume: false,
          skills: [skill('sk_typescript', 'TypeScript', 'Lenguajes', 5), skill('sk_comunicacion', 'Comunicación', 'Soft skills', 4)] },
      }),
      'GET /v1/skills': () => ({ body: [
        { id: 'sk_react', name: 'React', category: 'Frameworks', aliases: [] },
        { id: 'sk_empatia', name: 'Empatía', category: 'Soft skills', aliases: [] },
      ] }),
      'GET /v1/bff/candidate/dashboard': () => ({ body: dashboard() }),
      'PUT /v1/candidates/me/skills': ({ body }) => ({ body: { confirmedSkills: (body as { skills: unknown[] }).skills } }),
    });
    renderAt('/c/profile', { token: 'tkn' });

    const technical = await screen.findByRole('list', { name: 'Skills técnicas' });
    const soft = screen.getByRole('group', { name: 'Soft skills' });
    await waitFor(() => expect(within(technical).getByText('TypeScript')).toBeInTheDocument());
    expect(within(technical).queryByText('Comunicación')).not.toBeInTheDocument();
    expect(within(soft).getByText('Comunicación').closest('li')).toHaveClass('skill--soft');

    // El selector técnico no ofrece soft skills y viceversa.
    expect(within(screen.getByLabelText('Agregar skill')).queryByRole('option', { name: 'Empatía' })).not.toBeInTheDocument();
    await waitFor(() => expect(within(soft).getByRole('option', { name: 'Empatía' })).toBeInTheDocument());
    await userEvent.selectOptions(within(soft).getByRole('combobox', { name: 'Agregar soft skill' }), 'sk_empatia');
    await userEvent.click(within(soft).getByRole('button', { name: 'Agregar soft skill' }));
    expect(within(soft).getByText('Empatía')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar 3 skills' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT' && c.url === '/v1/candidates/me/skills')).toBe(true));
    const sent = calls.find((c) => c.method === 'PUT' && c.url === '/v1/candidates/me/skills')!.body as { skills: { skillId: string }[] };
    expect(sent.skills.map((x) => x.skillId).sort()).toEqual(['sk_comunicacion', 'sk_empatia', 'sk_typescript']);
  });
});
