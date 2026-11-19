import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SITE } from '../site';
import { fakeApi } from '../test/fake-api';
import { renderAt } from '../test/render';

describe('fondo animado de IA', () => {
  it('es el mismo en todas las páginas (decorativo, aria-hidden y uno solo)', async () => {
    fakeApi({ 'GET /v1/jobs': () => ({ body: { items: [] } }) });
    for (const path of ['/', '/login', '/login?demo=1', '/registro/candidato', '/registro/empleador', '/jobs', '/no-existe']) {
      const view = renderAt(path);
      const bg = await view.findAllByTestId('ai-background');
      expect(bg, path).toHaveLength(1);
      expect(bg[0]).toHaveAttribute('aria-hidden', 'true');
      view.unmount();
    }
  });
});

describe('footer', () => {
  it('muestra navegación de producto, compañía, legal y los datos de contacto (placeholders)', async () => {
    fakeApi({ 'GET /v1/jobs': () => ({ body: { items: [] } }) });
    renderAt('/jobs');
    const footer = await screen.findByRole('contentinfo');
    expect(within(footer).getByRole('navigation', { name: 'Producto' })).toBeInTheDocument();
    expect(within(footer).getByRole('link', { name: 'Para empresas' })).toHaveAttribute('href', '/registro/empleador');
    expect(within(footer).getByRole('link', { name: 'Aviso de privacidad' })).toBeInTheDocument();
    expect(within(footer).getByRole('link', { name: 'LinkedIn' })).toBeInTheDocument();
    expect(within(footer).getAllByText(SITE.company.legalName, { exact: false })).toHaveLength(2); // dirección y copyright
    expect(within(footer).getByRole('link', { name: SITE.company.email })).toHaveAttribute('href', `mailto:${SITE.company.email}`);
    expect(within(footer).getByText(new RegExp(`© ${new Date().getFullYear()}`))).toBeInTheDocument();
  });
});

describe('menú móvil', () => {
  it('el botón Menú abre y cierra la navegación y se cierra al navegar', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    fakeApi({ 'GET /v1/jobs': () => ({ body: { items: [], total: 0, page: 1, pageSize: 10, facets: { modality: {}, seniority: {}, country: {}, skills: [], salary: { min: null, max: null } } } }) });
    const { router } = renderAt('/jobs');
    const toggle = await screen.findByRole('button', { name: 'Menú' });
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(toggle).toHaveAttribute('aria-controls', nav.id);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(nav).toHaveClass('main-nav--open');

    await userEvent.click(within(nav).getByRole('link', { name: 'Entrar' }));
    expect(router.state.location.pathname).toBe('/login');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('sección de apps móviles', () => {
  it('aparece antes del footer con enlaces a App Store y Google Play (placeholders) y se omite en el portal del empleador', async () => {
    fakeApi({ 'GET /v1/jobs': () => ({ body: { items: [] } }) });
    const view = renderAt('/jobs');
    const apps = await view.findByTestId('mobile-apps');
    expect(within(apps).getByRole('heading', { name: 'Sigue tu proceso desde el celular' })).toBeInTheDocument();
    expect(within(apps).getByRole('link', { name: /App Store/ })).toHaveAttribute('href', SITE.apps.ios);
    expect(within(apps).getByRole('link', { name: /Google Play/ })).toHaveAttribute('href', SITE.apps.android);
    expect(apps.compareDocumentPosition(screen.getByRole('contentinfo')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    view.unmount();

    fakeApi({ 'GET /v1/me': () => ({ body: { id: 'usr_rec', email: 'reclutador@example.com', fullName: 'Rubén', role: 'recruiter', organizationId: 'org_fintech' } }), 'GET /v1/employer/jobs': () => ({ body: { items: [] } }) });
    renderAt('/e/vacantes', { token: 'tkn' });
    await screen.findByRole('heading', { name: 'Mis vacantes' });
    expect(screen.queryByTestId('mobile-apps')).not.toBeInTheDocument();
  });
});

describe('buscador de vacantes', () => {
  it('se envía con un ícono (botón accesible «Buscar» sin texto visible)', async () => {
    fakeApi({ 'GET /v1/jobs': () => ({ body: { items: [] } }) });
    renderAt('/jobs');
    const btn = await screen.findByRole('button', { name: 'Buscar' });
    expect(btn).toHaveTextContent('');
    expect(btn.querySelector('svg')).not.toBeNull();
  });
});

describe('ocultar y mostrar la sección de apps móviles', () => {
  it('el ícono ✕ la oculta (se recuerda) y el footer ofrece volver a mostrarla', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    localStorage.clear();
    fakeApi({ 'GET /v1/jobs': () => ({ body: { items: [] } }) });
    const view = renderAt('/jobs');
    const apps = await view.findByTestId('mobile-apps');
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).queryByRole('button', { name: /NexoTalent en tu dispositivo móvil/ })).not.toBeInTheDocument();

    await userEvent.click(within(apps).getByRole('button', { name: 'Ocultar la sección de apps móviles' }));
    expect(screen.queryByTestId('mobile-apps')).not.toBeInTheDocument();
    expect(localStorage.getItem('nexo.hideApps')).toBe('1');
    const show = within(footer).getByRole('button', { name: /NexoTalent en tu dispositivo móvil/ });
    view.unmount();

    // Se recuerda al volver a cargar.
    const again = renderAt('/jobs');
    await again.findByRole('heading', { name: 'Vacantes' });
    expect(screen.queryByTestId('mobile-apps')).not.toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('contentinfo')).getByRole('button', { name: /NexoTalent en tu dispositivo móvil/ }));
    expect(await screen.findByTestId('mobile-apps')).toBeInTheDocument();
    expect(localStorage.getItem('nexo.hideApps')).toBeNull();
    expect(within(screen.getByRole('contentinfo')).queryByRole('button', { name: /NexoTalent en tu dispositivo móvil/ })).not.toBeInTheDocument();
    void show;
  });
});

describe('leyenda de la landing', () => {
  it('muestra la leyenda arriba con su ícono animado decorativo, en ES y EN', async () => {
    fakeApi({ 'GET /v1/jobs': () => ({ body: { items: [] } }) });
    const es = renderAt('/');
    const claim = await es.findByTestId('landing-claim');
    expect(claim).toHaveTextContent('NexoTalent: la primera plataforma enfocada en los candidatos TI.');
    expect(claim.querySelector('.claim-brand')).toHaveTextContent('NexoTalent');
    expect(claim.querySelector('.claim-brand .gradient-text')).toHaveTextContent('Talent');
    expect(claim.querySelector('.claim-icon')).toHaveAttribute('aria-hidden', 'true');
    expect(claim.lastElementChild).toHaveClass('claim-icon'); // el ícono va a la derecha del texto
    es.unmount();
    renderAt('/', { lang: 'en' });
    expect(await screen.findByTestId('landing-claim')).toHaveTextContent('NexoTalent: the first platform focused on IT candidates.');
  });
});

describe('logo de la landing', () => {
  it('el logo superior izquierdo se agranda solo en la landing', async () => {
    fakeApi({ 'GET /v1/jobs': () => ({ body: { items: [] } }) });
    const landing = renderAt('/');
    await landing.findByTestId('landing-claim');
    expect(document.querySelector('header.topbar')).toHaveClass('topbar--landing');
    landing.unmount();
    renderAt('/jobs');
    await screen.findByRole('heading', { name: 'Vacantes' });
    expect(document.querySelector('header.topbar')).not.toHaveClass('topbar--landing');
  });
});
