import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fakeApi } from '../test/fake-api';
import { ana, dashboard, job, match } from '../test/fixtures';
import { renderAt } from '../test/render';

describe('login de demo', () => {
  it('entra como candidata y llega a su dashboard', async () => {
    fakeApi({
      'POST /v1/auth/demo-login': ({ body }) => ({ body: { token: 'tkn', user: { ...ana, email: (body as { email: string }).email } } }),
      'GET /v1/bff/candidate/dashboard': () => ({ body: dashboard() }),
    });
    const { router } = renderAt('/login?demo=1');
    await userEvent.click(await screen.findByRole('button', { name: /Ana · candidata con skills/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/c/dashboard'));
    expect(localStorage.getItem('nexo.token')).toBe('tkn');
    expect(await screen.findByRole('heading', { name: 'Hola, Ana' })).toBeInTheDocument();
  });

  it('rutas de candidato sin sesión redirigen a /login', async () => {
    fakeApi({});
    const { router } = renderAt('/c/dashboard');
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });
});

describe('detalle de vacante (HU-01)', () => {
  it('muestra score, radar accesible, brechas y permite postular', async () => {
    let applied = false;
    const { calls } = fakeApi({
      'GET /v1/me': () => ({ body: ana }),
      'GET /v1/jobs/job_backend_node': () => ({ body: job }),
      'GET /v1/jobs/job_backend_node/match': () => ({ body: match }),
      'GET /v1/bff/candidate/dashboard': () => ({ body: dashboard() }),
      'POST /v1/jobs/job_backend_node/applications': () => {
        applied = true;
        return { status: 201, body: { id: 'app_new', status: 'submitted', version: 1 } };
      },
    });
    renderAt('/jobs/job_backend_node', { token: 'tkn' });

    expect(await screen.findByRole('heading', { name: 'Backend Engineer Node.js' })).toBeInTheDocument();
    expect(await screen.findByRole('meter', { name: 'Match: 82%' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /vacante vs\. tú/i })).toBeInTheDocument();
    const gaps = screen.getByRole('heading', { name: 'Brechas' }).parentElement!;
    expect(within(gaps).getByText(/requiere 3, tienes 2/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Postular' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Te postulaste');
    expect(applied).toBe(true);
    expect(screen.getByRole('link', { name: 'Ver mi postulación' })).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(true);
  });

  it('candidata sin skills ve la invitación a subir su CV', async () => {
    fakeApi({
      'GET /v1/me': () => ({ body: ana }),
      'GET /v1/jobs/job_backend_node': () => ({ body: job }),
      'GET /v1/jobs/job_backend_node/match': () => ({ body: { ...match, score: 0, scorePercent: 0, radar: match.radar.map((p) => ({ ...p, candidate: 0 })) } }),
      'GET /v1/bff/candidate/dashboard': () => ({ body: dashboard({ applications: [] }) }),
    });
    renderAt('/jobs/job_backend_node', { token: 'tkn' });
    expect(await screen.findByRole('link', { name: /Sube tu CV y confirma tus skills/ })).toHaveAttribute('href', '/c/profile');
  });

  it('vacante inexistente → mensaje claro', async () => {
    fakeApi({ 'GET /v1/jobs/nope': () => ({ status: 404, body: { title: 'Vacante no encontrado', status: 404 } }) });
    renderAt('/jobs/nope');
    expect(await screen.findByRole('alert')).toHaveTextContent(/no existe o ya no está publicada/);
  });
});

describe('dashboard del candidato (HU-02)', () => {
  it('muestra el stepper de cada postulación y permite retirarse', async () => {
    let withdrawn = false;
    fakeApi({
      'GET /v1/me': () => ({ body: ana }),
      'GET /v1/bff/candidate/dashboard': () => ({ body: dashboard() }),
      'POST /v1/applications/app_1/withdraw': () => {
        withdrawn = true;
        return { body: { id: 'app_1', status: 'withdrawn', version: 4 } };
      },
    });
    window.confirm = () => true;
    renderAt('/c/dashboard', { token: 'tkn' });

    const card = (await screen.findByRole('heading', { name: 'Frontend Engineer React' })).closest('li')!;
    expect(within(card).getByRole('list', { name: 'Avance de tu postulación' })).toBeInTheDocument();
    expect(within(card).getAllByRole('listitem')[2]).toHaveAttribute('aria-current', 'step');

    await userEvent.click(within(card).getByRole('button', { name: 'Retirar postulación' }));
    await waitFor(() => expect(withdrawn).toBe(true));
  });

  it('sin skills confirmadas invita a completar el perfil', async () => {
    fakeApi({
      'GET /v1/me': () => ({ body: ana }),
      'GET /v1/bff/candidate/dashboard': () => ({ body: dashboard({ candidate: { id: 'c', fullName: 'Sofía Demo', hasConfirmedSkills: false }, applications: [] }) }),
    });
    renderAt('/c/dashboard', { token: 'tkn' });
    expect(await screen.findByRole('link', { name: 'Ir a mi perfil' })).toBeInTheDocument();
  });
});

describe('perfil: CV → skills propuestas → confirmar (HU-04 núcleo)', () => {
  it('extrae skills con IA, permite ajustar nivel, desmarcar y confirmar', async () => {
    const { calls } = fakeApi({
      'GET /v1/me': () => ({ body: ana }),
      'GET /v1/candidates/me': () => ({ body: { id: 'cand_ana', fullName: 'Ana', headline: null, seniority: null, skills: [], hasResume: false } }),
      'GET /v1/skills': () => ({ body: [{ id: 'sk_go', name: 'Go', category: 'Lenguajes', aliases: [] }, { id: 'sk_typescript', name: 'TypeScript', category: 'Lenguajes', aliases: [] }, { id: 'sk_aws', name: 'AWS', category: 'Cloud', aliases: [] }] }),
      'POST /v1/candidates/me/resume': () => ({
        body: {
          confirmedSkills: [],
          proposedSkills: [
            { skillId: 'sk_typescript', name: 'TypeScript', category: 'Lenguajes', level: 4, confirmed: false, source: 'extracted', evidence: 'experto en TypeScript' },
            { skillId: 'sk_aws', name: 'AWS', category: 'Cloud', level: 2, confirmed: false, source: 'extracted', evidence: 'nociones de AWS' },
          ],
        },
      }),
      'PUT /v1/candidates/me/skills': ({ body }) => ({ body: { confirmedSkills: body } }),
    });
    renderAt('/c/profile', { token: 'tkn' });

    const textarea = await screen.findByLabelText('Pega el texto de tu CV');
    await userEvent.type(textarea, 'Soy desarrolladora experta en TypeScript con nociones de AWS.');
    await userEvent.click(screen.getByRole('button', { name: /Extraer skills con IA/ }));

    expect(await screen.findByText('“experto en TypeScript”')).toBeInTheDocument();
    expect(screen.getByText('✦ Propuestas por IA')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: /AWS/ })); // desmarca AWS
    await userEvent.selectOptions(screen.getByLabelText('Agregar skill'), 'sk_go');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar 2 skills' }));

    expect(await screen.findByText('Skills confirmadas. Tu match se recalculó.')).toHaveAttribute('role', 'status');
    const put = calls.find((c) => c.method === 'PUT')!;
    expect(put.body).toEqual({ skills: [{ skillId: 'sk_typescript', level: 4 }, { skillId: 'sk_go', level: 3 }] });
  });
});
