/**
 * E2E: cambio de idioma ES/EN desde el selector al pie de la landing, y flujo anónimo
 * lista de vacantes → detalle → crear cuenta de candidato → volver a la vacante → postular.
 */
import { expect, test } from '@playwright/test';

test('E2E-20 · el selector al pie de la landing cambia toda la app a inglés y lo recuerda', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('explicado skill por skill');

  const switcher = page.getByRole('contentinfo').getByRole('group', { name: 'Idioma' });
  await switcher.scrollIntoViewIfNeeded();
  await switcher.getByRole('button', { name: 'English' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('explained skill by skill');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await expect(page.getByRole('link', { name: 'Sign up as a candidate' })).toBeVisible();

  // Se conserva al recargar y en otras páginas.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('explained skill by skill');
  await page.goto('/jobs');
  await expect(page.getByRole('heading', { level: 1, name: 'Jobs' })).toBeVisible();
  await expect(page.locator('.results-count')).toContainText('jobs');
  await expect(page.getByRole('checkbox', { name: /Urgent jobs only/ })).toBeVisible();
  await expect(page.locator('.job-row').first()).toContainText('/mo');

  // Y se puede volver a español.
  await page.getByRole('contentinfo').getByRole('button', { name: 'Español' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Vacantes' })).toBeVisible();
});

test('E2E-21 · ?lang=en abre directamente en inglés', async ({ page }) => {
  await page.goto('/login?lang=en');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sign in to NexoTalent');
  await expect(page.getByRole('tab', { name: 'Candidate' })).toBeVisible();
});

test('E2E-22 · sin sesión: clic en la vacante → detalle → crear cuenta → volver y postular', async ({ page }) => {
  const run = Date.now().toString(36);
  await page.goto('/jobs?q=fintech');
  const row = page.locator('.job-row').first();
  const title = (await row.locator('.job-row__title a').textContent())!.trim();

  // Clic en la tarjeta (no en el enlace) abre el detalle.
  await row.locator('.job-row__meta').click();
  await expect(page).toHaveURL(/\/jobs\/job_/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title);

  // Para postular hay que registrarse como candidato.
  const cta = page.getByRole('region', { name: 'Postúlate a esta vacante' });
  await expect(cta).toBeVisible();
  await cta.getByRole('link', { name: 'Crear cuenta de candidato y postular' }).click();
  await expect(page.getByText(`Crea tu cuenta para postularte a «${title}».`)).toBeVisible();

  await page.getByLabel('Nombre completo').fill('Paula Postulante');
  await page.getByLabel('Correo').fill(`paula-${run}@example.com`);
  await page.getByLabel('Contraseña').fill('Segura123');
  await page.getByRole('checkbox', { name: /aviso de privacidad/ }).check();
  await page.getByRole('button', { name: 'Crear cuenta de candidato' }).click();

  // Regresa a la vacante con la bienvenida y el botón Postular.
  await expect(page).toHaveURL(/\/jobs\/job_.+\?registered=1$/);
  await expect(page.getByText('¡Cuenta creada! Ya puedes postularte a esta vacante.')).toBeVisible();
  await page.getByRole('button', { name: 'Postular' }).click();
  await expect(page.getByText(/Te postulaste/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver mi postulación' })).toBeVisible();
});

for (const width of [1280, 768, 360]) {
  test(`E2E-23 · el selector de idioma queda fijo a la derecha al cambiar de idioma (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const bar = page.locator('.site-footer__bottom');
    const switcher = page.getByRole('contentinfo').getByRole('group', { name: 'Idioma' });
    await switcher.scrollIntoViewIfNeeded();
    const before = (await switcher.boundingBox())!;
    const barBox = (await bar.boundingBox())!;
    const padRight = await bar.evaluate((el) => parseFloat(getComputedStyle(el).paddingRight));
    // Pegado al borde derecho de la barra (descontando su padding).
    expect(Math.abs(before.x + before.width - (barBox.x + barBox.width - padRight))).toBeLessThanOrEqual(1);

    await switcher.getByRole('button', { name: 'English' }).click();
    const switcherEn = page.getByRole('contentinfo').getByRole('group', { name: 'Language' });
    await expect(switcherEn).toBeVisible();
    const after = (await switcherEn.boundingBox())!;
    expect(Math.round(after.x)).toBe(Math.round(before.x));
    expect(Math.round(after.width)).toBe(Math.round(before.width));
  });
}

for (const width of [1440, 1024, 768]) {
  test(`E2E-24 · los textos legales del footer ocupan exactamente 2 líneas en ES y EN (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const lang of ['es', 'en']) {
      await page.goto(`/?lang=${lang}`);
      const r = await page.evaluate(() => {
        const spans = [...document.querySelectorAll('.site-footer__legal > span')] as HTMLElement[];
        const lh = parseFloat(getComputedStyle(spans[0]!).lineHeight);
        return { count: spans.length, lines: spans.map((s) => Math.round(s.getBoundingClientRect().height / lh)), truncated: spans.some((s) => s.scrollWidth > s.clientWidth + 1) };
      });
      expect(r, lang).toEqual({ count: 2, lines: [1, 1], truncated: false });
    }
  });
}
