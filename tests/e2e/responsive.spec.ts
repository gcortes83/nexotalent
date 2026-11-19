/**
 * Auditoría responsiva: cada página en móvil, tablet y escritorio, sin scroll horizontal y con la
 * navegación accesible. Con SCREENSHOT_DIR=... guarda una captura por página y ancho para revisión visual.
 */
import { expect, type Page, test } from '@playwright/test';

const VIEWPORTS = [
  { name: 'movil', width: 360, height: 780 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'escritorio', width: 1280, height: 800 },
] as const;

type Who = 'anon' | 'candidata@example.com' | 'reclutador@example.com';
const PAGES: { path: string; who: Who; ready: RegExp | string }[] = [
  { path: '/', who: 'anon', ready: /explicado skill por skill/ },
  { path: '/login', who: 'anon', ready: 'Inicia sesión' },
  { path: '/login?demo=1', who: 'anon', ready: 'Entra con una cuenta de demo' },
  { path: '/registro/candidato', who: 'anon', ready: 'Crea tu cuenta de candidato' },
  { path: '/registro/empleador', who: 'anon', ready: 'Registra tu empresa' },
  { path: '/jobs', who: 'anon', ready: 'vacantes' },
  { path: '/jobs/job_backend_node', who: 'candidata@example.com', ready: 'Tu match' },
  { path: '/c/dashboard', who: 'candidata@example.com', ready: 'Mis postulaciones' },
  { path: '/c/profile', who: 'candidata@example.com', ready: 'Vacantes a las que me postulé' },
  { path: '/e/dashboard', who: 'reclutador@example.com', ready: 'Dashboard del empleador' },
  { path: '/e/jobs/job_frontend_react', who: 'reclutador@example.com', ready: 'Candidatos' },
  { path: '/e/vacantes', who: 'reclutador@example.com', ready: 'Mis vacantes' },
  { path: '/e/vacantes/nueva', who: 'reclutador@example.com', ready: 'Nueva vacante' },
  { path: '/e/vacantes/job_backend_node/editar', who: 'reclutador@example.com', ready: 'Editar vacante' },
  { path: '/e/importar', who: 'reclutador@example.com', ready: 'Importar vacantes' },
  { path: '/no-existe', who: 'anon', ready: 'Página no encontrada' },
];

const tokens = new Map<string, string>();
async function signIn(page: Page, who: Who) {
  if (who === 'anon') return;
  if (!tokens.has(who)) {
    const res = await page.request.post('/v1/auth/demo-login', { data: { email: who } });
    tokens.set(who, (await res.json()).token);
  }
  await page.addInitScript((t) => localStorage.setItem('nexo.token', t), tokens.get(who)!);
}

/** Elementos visibles que se salen del viewport (para un mensaje de error útil). */
const overflowing = (page: Page) =>
  page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width) return false;
        // Lo que vive dentro de un contenedor fijo (p. ej. la aurora del fondo animado) no genera scroll del documento.
        for (let p: HTMLElement | null = el; p; p = p.parentElement) if (getComputedStyle(p).position === 'fixed') return false;
        // El enlace de salto se esconde fuera de pantalla a propósito. Los .sr-only SÍ se reportan: una
        // <table class="sr-only"> ignora width: 1px y fue la causa del scroll en móvil con fuentes anchas.
        if (el.closest('.skip-link')) return false;
        // Contenedores con scroll horizontal propio (p. ej. stepper) son válidos.
        for (let p = el.parentElement; p; p = p.parentElement) if (['auto', 'scroll'].includes(getComputedStyle(p).overflowX)) return false;
        return r.right > w + 1 || r.left < -1;
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 80));
  });

for (const vp of VIEWPORTS) {
  test.describe(`responsivo · ${vp.name} (${vp.width}px)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const p of PAGES) {
      test(`${p.path}`, async ({ page }) => {
        await signIn(page, p.who);
        await page.goto(p.path);
        await expect(page.getByText(p.ready).filter({ visible: true }).first()).toBeVisible();
        await page.waitForTimeout(300);

        const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(scroll, `scroll horizontal; se salen: ${(await overflowing(page)).join(' | ')}`).toBeLessThanOrEqual(1);

        // La navegación principal sigue disponible (en móvil, tras el botón de menú).
        const menu = page.getByRole('button', { name: 'Menú' });
        if (await menu.isVisible()) await menu.click();
        await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Vacantes', exact: true })).toBeVisible();

        if (process.env.SCREENSHOT_DIR) {
          if (await menu.isVisible()) await menu.click();
          const name = `${vp.name}${p.path.replace(/[/?=]/g, '_')}.png`;
          await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/${name}`, fullPage: true });
        }
      });
    }
  });
}

test.describe('vacantes: 90 % del ancho y filtros en una línea', () => {
  for (const width of [900, 1280, 1600]) {
    test(`${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/jobs');
      await page.getByRole('checkbox', { name: /Solo vacantes urgentes/ }).waitFor();
      const r = await page.evaluate(() => {
        const lineH = (el: Element) => parseFloat(getComputedStyle(el).lineHeight) || 24;
        const labels = [...document.querySelectorAll('.filters-panel legend, .filters-panel .facet > span:nth-child(2), .filters-panel .urgent-toggle .row > span')];
        return {
          pct: (document.querySelector('.jobs-page')!.getBoundingClientRect().width / document.documentElement.clientWidth) * 100,
          multiline: labels.filter((el) => (el as HTMLElement).offsetHeight > lineH(el) * 1.5).map((el) => el.textContent),
          truncated: labels.filter((el) => (el as HTMLElement).scrollWidth > (el as HTMLElement).clientWidth + 1).map((el) => el.textContent),
        };
      });
      expect(r.pct).toBeGreaterThan(89.5);
      expect(r.pct).toBeLessThan(90.5);
      expect(r.multiline, 'textos del menú en dos líneas').toEqual([]);
      expect(r.truncated, 'textos del menú recortados').toEqual([]);
    });
  }
});
