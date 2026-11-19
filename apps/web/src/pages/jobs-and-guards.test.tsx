import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fakeApi } from '../test/fake-api';
import { ana, dashboard, job, match, ruben } from '../test/fixtures';
import { renderAt } from '../test/render';

const facets = {
  modality: { remote: 4, hybrid: 3, onsite: 1 }, seniority: { junior: 1, mid: 3, senior: 3, lead: 1 }, country: { MX: 7, CO: 1 },
  skills: [{ name: 'TypeScript', count: 3 }, { name: 'React', count: 2 }], salary: { min: 2000, max: 9500 },
};
const page = (items: unknown[], extra: object = {}) => ({ body: { items, total: items.length, page: 1, pageSize: 10, facets, ...extra } });
const lastSearch = (calls: { url: string }[]) => new URL(`http://x${calls.filter((c) => c.url.startsWith('/v1/jobs')).at(-1)!.url}`).searchParams;

describe('listado de vacantes', () => {
  it('muestra la lista con empresa, modalidad, salario, skills obligatorias y enlace al detalle', async () => {
    fakeApi({ 'GET /v1/jobs': () => page([job]) });
    renderAt('/jobs');

    const row = (await screen.findByRole('link', { name: 'Backend Engineer Node.js' })).closest('li')!;
    expect(screen.getByRole('link', { name: 'Backend Engineer Node.js' })).toHaveAttribute('href', '/jobs/job_backend_node');
    expect(within(row).getByText(/posiciones disponibles/)).toBeInTheDocument();
    expect(within(row).getByText('TypeScript')).toBeInTheDocument();
    expect(within(row).getAllByLabelText('obligatoria').length).toBeGreaterThan(0);
    expect(within(row).getByText('US$4,100 – US$5,500')).toBeInTheDocument();
    expect(within(row).getByText(/\/mes/)).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: /Ver detalle y match/ })).toBeInTheDocument();
    expect(document.querySelector('.results-count')).toHaveTextContent('1 vacante');
  });

  it('busca por término (en la URL) y muestra "sin resultados"', async () => {
    const { calls } = fakeApi({ 'GET /v1/jobs': ({ url }) => (url.includes('q=cobol') ? page([]) : page([job])) });
    const { router } = renderAt('/jobs');
    await screen.findByRole('link', { name: 'Backend Engineer Node.js' });

    await userEvent.type(screen.getByLabelText('Buscar vacantes'), '  cobol ');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('Sin resultados para “cobol”.')).toBeInTheDocument();
    expect(lastSearch(calls).get('q')).toBe('cobol');
    expect(router.state.location.search).toContain('q=cobol');
  });

  it('filtra por modalidad, seniority, skill y salario; muestra conteos y chips removibles', async () => {
    const { calls } = fakeApi({ 'GET /v1/jobs': () => page([job]) });
    const { router } = renderAt('/jobs');
    const filters = await screen.findByRole('complementary', { name: 'Filtros' });

    await waitFor(() => expect(within(filters).getByRole('checkbox', { name: /Remoto/ }).closest('label')).toHaveTextContent('Remoto4'));
    await userEvent.click(within(filters).getByRole('checkbox', { name: /Remoto/ }));
    await userEvent.click(within(filters).getByRole('checkbox', { name: /Senior/ }));
    await userEvent.click(within(filters).getByRole('button', { name: /^TypeScript/ }));
    await userEvent.click(within(filters).getByRole('radio', { name: 'Desde US$2,500' }));

    await waitFor(() => {
      const p = lastSearch(calls);
      expect(p.get('modality')).toBe('remote');
      expect(p.get('seniority')).toBe('senior');
      expect(p.get('skills')).toBe('TypeScript');
      expect(p.get('minSalary')).toBe('2500');
    });
    expect(router.state.location.search).toContain('modality=remote');

    const active = screen.getByRole('list', { name: 'Filtros activos' });
    await userEvent.click(within(active).getByRole('button', { name: 'Quitar filtro Remoto' }));
    await waitFor(() => expect(lastSearch(calls).get('modality')).toBeNull());

    await userEvent.click(within(active).getByRole('button', { name: 'Limpiar todo' }));
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Filtros activos' })).not.toBeInTheDocument());
    expect(lastSearch(calls).get('seniority')).toBeNull();
  });

  it('restaura filtros desde la URL, ordena y pagina', async () => {
    const { calls } = fakeApi({ 'GET /v1/jobs': ({ url }) => page([job], { total: 25, page: url.includes('page=2') ? 2 : 1 }) });
    renderAt('/jobs?modality=hybrid&sort=salary_desc');
    expect(await screen.findByRole('button', { name: 'Quitar filtro Híbrido' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Ordenar por' })).toHaveValue('salary_desc');
    expect(lastSearch(calls).get('sort')).toBe('salary_desc');

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Ordenar por' }), 'positions');
    await waitFor(() => expect(lastSearch(calls).get('sort')).toBe('positions'));

    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente →' }));
    await waitFor(() => expect(lastSearch(calls).get('page')).toBe('2'));
    expect(await screen.findByText('Página 2 de 3')).toBeInTheDocument();
  });

  it('marca las vacantes urgentes con 🔥 y filtra solo urgentes', async () => {
    const { calls } = fakeApi({ 'GET /v1/jobs': () => page([{ ...job, urgent: true }, { ...job, id: 'job_x', title: 'Otra vacante', urgent: false }], { facets: { ...facets, urgent: 1 } }) });
    const { router } = renderAt('/jobs');

    const urgentRow = (await screen.findByRole('link', { name: 'Backend Engineer Node.js' })).closest('li')!;
    expect(within(urgentRow).getByText('Urgente')).toBeInTheDocument();
    expect(urgentRow).toHaveClass('job-row--urgent');
    const otherRow = screen.getByRole('link', { name: 'Otra vacante' }).closest('li')!;
    expect(within(otherRow).queryByText('Urgente')).not.toBeInTheDocument();

    const toggle = screen.getByRole('checkbox', { name: /Solo vacantes urgentes/ });
    expect(toggle.closest('label')).toHaveTextContent('1');
    await userEvent.click(toggle);
    await waitFor(() => expect(lastSearch(calls).get('urgent')).toBe('true'));
    expect(router.state.location.search).toContain('urgent=true');
    expect(screen.getByRole('button', { name: 'Quitar filtro 🔥 Urgentes' })).toBeInTheDocument();
  });

  it('muestra alerta si la API falla', async () => {
    fakeApi({ 'GET /v1/jobs': () => ({ status: 500, body: { title: 'boom', status: 500 } }) });
    renderAt('/jobs');
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las vacantes.');
  });
});

describe('guardas de rol y navegación', () => {
  it('la raíz sin sesión muestra la landing con registro de candidatos, empleadores y vacantes', async () => {
    fakeApi({ 'GET /v1/jobs': () => ({ body: { items: [job] } }) });
    renderAt('/');
    expect(await screen.findByRole('heading', { level: 1, name: /explicado skill por skill/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Registrarme como candidato' })).toHaveAttribute('href', '/registro/candidato');
    expect(screen.getByRole('link', { name: 'Registrar mi empresa' })).toHaveAttribute('href', '/registro/empleador');
    expect(screen.getByRole('link', { name: 'Ver vacantes' })).toHaveAttribute('href', '/jobs');
    expect(await screen.findByText('1 vacantes abiertas', { exact: false })).toBeInTheDocument();
  });

  it('la raíz con sesión lleva al dashboard del rol', async () => {
    fakeApi({ 'GET /v1/me': () => ({ body: ana }), 'GET /v1/bff/candidate/dashboard': () => ({ body: null }) });
    const { router } = renderAt('/', { token: 'tkn' });
    await waitFor(() => expect(router.state.location.pathname).toBe('/c/dashboard'));
  });

  it('un reclutador que abre una ruta de candidato vuelve a su dashboard', async () => {
    fakeApi({
      'GET /v1/me': () => ({ body: ruben }),
      'GET /v1/bff/employer/dashboard': () => ({ body: { jobs: [], staleApplications: [] } }),
    });
    const { router } = renderAt('/c/profile', { token: 'tkn' });
    await waitFor(() => expect(router.state.location.pathname).toBe('/e/dashboard'));
    expect(screen.queryByRole('link', { name: 'Mi perfil' })).not.toBeInTheDocument();
  });

  it('una candidata no puede abrir el portal del empleador', async () => {
    fakeApi({ 'GET /v1/me': () => ({ body: ana }), 'GET /v1/bff/candidate/dashboard': () => ({ body: null }) });
    const { router } = renderAt('/e/jobs/job_backend_node', { token: 'tkn' });
    await waitFor(() => expect(router.state.location.pathname).toBe('/c/dashboard'));
  });

  it('cerrar sesión borra el token y regresa al menú público', async () => {
    fakeApi({ 'GET /v1/me': () => ({ body: ana }), 'GET /v1/jobs': () => ({ body: { items: [] } }) });
    renderAt('/jobs', { token: 'tkn' });

    await userEvent.click(await screen.findByRole('button', { name: 'Salir (Ana)' }));

    expect(localStorage.getItem('nexo.token')).toBeNull();
    expect(await screen.findByRole('link', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('ruta desconocida muestra "Página no encontrada"', async () => {
    fakeApi({});
    renderAt('/no-existe');
    expect(await screen.findByText('Página no encontrada.')).toBeInTheDocument();
  });
});

describe('vacante → detalle → postular', () => {
  it('clic en cualquier parte de la tarjeta abre el detalle', async () => {
    fakeApi({ 'GET /v1/jobs': () => page([job]) });
    const { router } = renderAt('/jobs');
    const row = (await screen.findAllByTestId('job-row'))[0]!;
    await userEvent.click(within(row).getByText(/posiciones disponibles/));
    await waitFor(() => expect(router.state.location.pathname).toBe('/jobs/job_backend_node'));
  });

  it('sin sesión el detalle pide crear cuenta de candidato (o iniciar sesión) y vuelve a la vacante', async () => {
    fakeApi({ 'GET /v1/jobs/job_backend_node': () => ({ body: job }) });
    renderAt('/jobs/job_backend_node');
    const cta = await screen.findByRole('region', { name: 'Postúlate a esta vacante' });
    const register = within(cta).getByRole('link', { name: 'Crear cuenta de candidato y postular' });
    expect(register.getAttribute('href')).toBe('/registro/candidato?next=%2Fjobs%2Fjob_backend_node&job=Backend%20Engineer%20Node.js');
    expect(within(cta).getByRole('link', { name: /Ya tengo cuenta/ })).toHaveAttribute('href', '/login?next=%2Fjobs%2Fjob_backend_node');
    expect(screen.queryByRole('button', { name: 'Postular' })).not.toBeInTheDocument();
  });

  it('registrarse desde la vacante regresa a ella con la bienvenida y el botón Postular', async () => {
    fakeApi({
      'POST /v1/auth/register/candidate': () => ({ status: 201, body: { token: 'tkn', user: { ...ana, id: 'usr_new' } } }),
      'GET /v1/jobs/job_backend_node': () => ({ body: job }),
      'GET /v1/jobs/job_backend_node/match': () => ({ body: { ...match, score: 0, scorePercent: 0, strengths: [], factors: { ...match.factors, skillCoverage: 0 } } }),
      'GET /v1/bff/candidate/dashboard': () => ({ body: { ...dashboard(), applications: [] } }),
    });
    const { router } = renderAt('/registro/candidato?next=%2Fjobs%2Fjob_backend_node&job=Backend%20Engineer%20Node.js');
    expect(await screen.findByText('Crea tu cuenta para postularte a «Backend Engineer Node.js».')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Nombre completo'), 'Carla Registro');
    await userEvent.type(screen.getByLabelText('Correo'), 'carla@example.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Segura123');
    await userEvent.click(screen.getByRole('checkbox', { name: /aviso de privacidad/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta de candidato' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/jobs/job_backend_node'));
    expect(router.state.location.search).toBe('?registered=1');
    expect(await screen.findByText('¡Cuenta creada! Ya puedes postularte a esta vacante.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Postular' })).toBeInTheDocument();
  });

  it('el login con next vuelve a la vacante; un next externo se ignora', async () => {
    fakeApi({
      'POST /v1/auth/login': () => ({ body: { token: 'tkn', user: ana } }),
      'GET /v1/jobs/job_backend_node': () => ({ body: job }),
      'GET /v1/jobs/job_backend_node/match': () => ({ body: match }),
      'GET /v1/bff/candidate/dashboard': () => ({ body: dashboard() }),
    });
    const { router } = renderAt('/login?next=%2Fjobs%2Fjob_backend_node');
    expect(await screen.findByText('Inicia sesión como candidato para postularte a la vacante.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Correo'), 'candidata@example.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Demo1234');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar como candidato' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/jobs/job_backend_node'));
  });

  it('safeNext rechaza redirecciones abiertas', async () => {
    const { safeNext } = await import('../auth/session');
    expect(safeNext('/jobs/x')).toBe('/jobs/x');
    for (const bad of ['//evil.example.com', 'https://evil.example.com', '/\\evil', '', null]) expect(safeNext(bad)).toBeNull();
  });

  it('un reclutador ve que las postulaciones son solo para candidatos', async () => {
    fakeApi({ 'GET /v1/me': () => ({ body: ruben }), 'GET /v1/jobs/job_backend_node': () => ({ body: job }) });
    renderAt('/jobs/job_backend_node', { token: 'tkn' });
    expect(await screen.findByRole('note')).toHaveTextContent('Las postulaciones son solo para cuentas de candidato.');
    expect(screen.queryByRole('region', { name: 'Postúlate a esta vacante' })).not.toBeInTheDocument();
  });
});

describe('soft skills en verde', () => {
  it('el detalle separa las soft skills y muestra dos radares por skill: técnicas y soft (verde)', async () => {
    const soft = { name: 'Comunicación', category: 'Soft skills', level: 3, mustHave: false };
    fakeApi({
      'GET /v1/me': () => ({ body: ana }),
      'GET /v1/jobs/job_backend_node': () => ({ body: { ...job, skills: [...job.skills, soft] } }),
      'GET /v1/jobs/job_backend_node/match': () => ({ body: { ...match, radar: [...match.radar, { axis: 'Soft skills', required: 3, candidate: 2 }] } }),
      'GET /v1/bff/candidate/dashboard': () => ({ body: dashboard() }),
      'GET /v1/candidates/me': () => ({
        body: { id: 'cand_ana', fullName: 'Ana', headline: null, seniority: 'senior', country: 'MX', preferredModalities: [], salaryExpectation: null, hasResume: true,
          skills: [
            { skillId: 'sk_typescript', name: 'TypeScript', category: 'Lenguajes', level: 5, confirmed: true, source: 'declared', evidence: null },
            { skillId: 'sk_comunicacion', name: 'Comunicación', category: 'Soft skills', level: 4, confirmed: true, source: 'declared', evidence: null },
          ] },
      }),
    });
    renderAt('/jobs/job_backend_node', { token: 'tkn' });
    const softList = await screen.findByRole('list', { name: 'Soft skills' });
    expect(within(softList).getByText(/Comunicación/)).toHaveClass('chip--soft');
    expect(within(screen.getByRole('list', { name: 'Skills requeridas' })).queryByText(/Comunicación/)).not.toBeInTheDocument();
    // Radar técnico: un eje por skill técnica de la vacante, con tu nivel confirmado.
    const tech = await screen.findByRole('table', { name: 'Skills técnicas: vacante vs. tú' });
    await waitFor(() => expect(within(tech).getByRole('row', { name: /TypeScript/ })).toHaveTextContent('TypeScript45'));
    expect(within(tech).queryByRole('rowheader', { name: 'Comunicación' })).not.toBeInTheDocument();
    // Radar de soft skills (verde): la vacante pide 1 → se completa hasta 3 ejes y se avisa.
    const softPanel = screen.getByTestId('radar-soft');
    const softTable = within(softPanel).getByRole('table', { name: 'Soft skills: vacante vs. tú' });
    expect(within(softTable).getByRole('row', { name: /Comunicación/ })).toHaveTextContent('Comunicación34');
    expect(within(softTable).getAllByRole('row')).toHaveLength(4); // encabezado + 3 ejes
    expect(within(softPanel).getByText(/Se completó con skills de tu perfil/)).toBeInTheDocument();
  });
});

describe('selección de vacante en la lista', () => {
  it('al hacer clic queda seleccionada (y se recuerda); al volver a la lista se resalta; urgente combina ambos estilos', async () => {
    sessionStorage.clear();
    fakeApi({ 'GET /v1/jobs': () => page([{ ...job, urgent: true }, { ...job, id: 'job_x', title: 'Otra vacante' }]) });
    const first = renderAt('/jobs');
    const rows = await first.findAllByTestId('job-row');
    expect(rows.every((r) => !r.classList.contains('job-row--selected'))).toBe(true);
    await userEvent.click(within(rows[0]!).getByText(/posiciones disponibles/));
    expect(sessionStorage.getItem('nexo.lastJob')).toBe('job_backend_node');
    first.unmount();

    const back = renderAt('/jobs');
    const [urgentRow, otherRow] = await back.findAllByTestId('job-row');
    expect(urgentRow).toHaveClass('job-row--selected', 'job-row--urgent');
    expect(otherRow).not.toHaveClass('job-row--selected');

    // Con teclado: el foco también selecciona.
    within(otherRow!).getByRole('link', { name: 'Otra vacante' }).focus();
    await waitFor(() => expect(otherRow).toHaveClass('job-row--selected'));
    expect(urgentRow).not.toHaveClass('job-row--selected');
  });
});
