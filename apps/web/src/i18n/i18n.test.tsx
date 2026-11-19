import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiError, problemMessage } from '../api/client';
import type { AppNotification } from '../api/types';
import { localizeNotification } from '../components/NotificationWatcher';
import { explainMatch } from '../pages/JobDetailPage';
import { fakeApi } from '../test/fake-api';
import { match } from '../test/fixtures';
import { renderAt } from '../test/render';
import { en } from './en';
import { es } from './es';
import { initialLang } from './index';

/** Forma de un diccionario: claves anidadas, largo de arreglos y aridad de funciones. */
function shape(v: unknown, path = ''): string[] {
  if (typeof v === 'function') return [`${path}()${v.length}`];
  if (Array.isArray(v)) return [`${path}[${v.length}]`, ...v.flatMap((x, i) => shape(x, `${path}[${i}]`))];
  if (v && typeof v === 'object') {
    // Mapas de datos (byCode, demoLabels, países…) pueden diferir en contenido.
    if (/byCode$/.test(path)) return [path];
    return Object.entries(v).flatMap(([k, x]) => shape(x, path ? `${path}.${k}` : k));
  }
  return [path];
}

afterEach(() => localStorage.clear());

describe('diccionarios', () => {
  it('ES y EN tienen exactamente las mismas claves, arreglos y parámetros', () => {
    expect(shape(en)).toEqual(shape(es));
  });

  it('ningún texto en inglés quedó vacío', () => {
    const empty = shape(en).filter((p) => !p.endsWith(')0') && !p.includes('()'));
    const values = empty.map((p) => p.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k.replace(/\[\d+\]$/, '')], en));
    expect(values.filter((v) => v === '')).toEqual([]);
  });
});

describe('idioma inicial', () => {
  it('español por defecto; recuerda la elección; ?lang= tiene prioridad', () => {
    expect(initialLang()).toBe('es');
    localStorage.setItem('nexo.lang', 'en');
    expect(initialLang()).toBe('en');
    window.history.replaceState(null, '', '/?lang=es');
    expect(initialLang()).toBe('es');
    window.history.replaceState(null, '', '/');
  });
});

describe('selector de idioma (footer)', () => {
  it('cambia toda la interfaz a inglés, actualiza <html lang> y recuerda la elección', async () => {
    fakeApi({ 'GET /v1/jobs': () => ({ body: { items: [], total: 28, page: 1, pageSize: 3, facets: { modality: {}, seniority: {}, country: {}, skills: [], salary: { min: null, max: null }, urgent: 0 } } }) });
    renderAt('/');
    expect(await screen.findByRole('heading', { level: 1, name: /explicado skill por skill/ })).toBeInTheDocument();

    const switcher = screen.getByRole('group', { name: 'Idioma' });
    expect(within(switcher).getByRole('button', { name: 'Español' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(within(switcher).getByRole('button', { name: 'English' }));

    expect(await screen.findByRole('heading', { level: 1, name: /explained skill by skill/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up as a candidate' })).toHaveAttribute('href', '/registro/candidato');
    expect(screen.getByRole('navigation', { name: 'Main' })).toHaveTextContent('Jobs');
    expect(await screen.findByText(/28 open jobs/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en-US');
    expect(localStorage.getItem('nexo.lang')).toBe('en');
  });

  it('en inglés la lista de vacantes traduce filtros, orden y etiquetas', async () => {
    fakeApi({
      'GET /v1/jobs': () => ({
        body: { items: [], total: 0, page: 1, pageSize: 10, facets: { modality: { remote: 2 }, seniority: { mid: 1 }, country: { MX: 2 }, skills: [], salary: { min: null, max: null }, urgent: 1 } },
      }),
    });
    renderAt('/jobs', { lang: 'en' });
    const panel = await screen.findByRole('complementary', { name: 'Filters' });
    expect(within(panel).getByRole('checkbox', { name: /Urgent jobs only/ })).toBeInTheDocument();
    expect(within(panel).getByRole('checkbox', { name: /Remote/ })).toBeInTheDocument();
    expect(await within(panel).findByRole('checkbox', { name: /Mexico/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveDisplayValue('Most recent');
    expect(await screen.findByText('No jobs match the filters.')).toBeInTheDocument();
  });
});

describe('textos generados en el cliente', () => {
  it('errores de la API por código, en inglés', async () => {
    renderAt('/no-existe', { lang: 'en' });
    await screen.findByText('Page not found.');
    const err = new ApiError(401, { type: 'https://nexotalent.example.com/problems/invalid-credentials', title: 'Correo o contraseña incorrectos.', status: 401 });
    expect(problemMessage(err)).toMatch(/^Incorrect email or password/);
    expect(problemMessage(new ApiError(412, null))).toMatch(/Someone else updated/);
  });

  it('notificaciones redactadas en el idioma activo', () => {
    const n: AppNotification = {
      id: 'n', userId: 'u', kind: 'selected', title: '¡Fuiste preseleccionado!', body: '…', readAt: null, createdAt: '',
      data: { status: 'shortlisted', jobTitle: 'QA Engineer' },
    };
    expect(localizeNotification(n, en)).toEqual({ title: 'You were shortlisted!', body: expect.stringContaining('“QA Engineer”') });
    expect(localizeNotification({ ...n, kind: 'job_closed', data: { jobTitle: 'QA', organizationName: 'Acme' } }, en).body).toBe('Acme closed the job “QA”. Your application stays in your history.');
    expect(localizeNotification({ ...n, data: {} }, en)).toEqual({ title: n.title, body: n.body }); // sin datos: texto de la API
  });

  it('explicación del match en inglés a partir de los datos', () => {
    expect(explainMatch(match, en)).toMatch(/^You meet \d+ of \d+ required skills\./);
    expect(explainMatch(match, es)).toMatch(/^Cumples \d+ de \d+ skills requeridas\./);
  });
});

describe('cambio de idioma en vivo', () => {
  it('las etiquetas de estatus siguen el idioma', async () => {
    fakeApi({ 'GET /v1/jobs': () => ({ body: { items: [] } }) });
    renderAt('/', { lang: 'en' });
    const footer = await screen.findByRole('contentinfo');
    await userEvent.click(within(footer).getByRole('button', { name: 'Español' }));
    await waitFor(() => expect(within(footer).getByRole('navigation', { name: 'Producto' })).toBeInTheDocument());
  });
});
