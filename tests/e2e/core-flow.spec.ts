/**
 * E2E del núcleo MVP en un navegador real, contra la app levantada (sin mocks):
 * login → radar y score → CV → skills confirmadas → postular → stepper → el reclutador
 * cambia el estatus → la candidata lo ve y retira su postulación.
 */
import { expect, type Page, test } from '@playwright/test';

const CV = `Sofía Demo — Desarrolladora full-stack.
Experiencia avanzada en TypeScript, JavaScript y Node.js construyendo APIs con Fastify.
Uso diario de React, PostgreSQL y Docker; nociones de AWS y Python. Inglés intermedio. Git y TDD con Vitest.`;

async function loginAs(page: Page, account: RegExp) {
  await page.goto('/login?demo=1');
  await page.getByRole('button', { name: account }).click();
  // El token se guarda al completar el login: espera la redirección antes de navegar.
  await page.waitForURL(/\/(c|e)\/dashboard$/);
}

async function logout(page: Page) {
  await page.getByRole('button', { name: /^Salir/ }).click();
  await expect(page.getByRole('link', { name: 'Entrar', exact: true })).toBeVisible();
}

test.describe.configure({ mode: 'serial' });

test('E2E-01 · Ana entra y ve su dashboard con stepper y recomendaciones', async ({ page }) => {
  await loginAs(page, /Ana · candidata con skills/);
  await expect(page).toHaveURL(/\/c\/dashboard$/);
  await expect(page.getByRole('heading', { name: /^Hola, Ana/ })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Avance de tu postulación' }).first()).toBeVisible();
  await expect(page.getByText(/Recomendadas para ti/)).toBeVisible();
});

test('E2E-02 · detalle de vacante con score, radar accesible, fortalezas y brechas', async ({ page }) => {
  await loginAs(page, /Ana · candidata con skills/);
  await page.goto('/jobs/job_backend_node');
  await expect(page.getByRole('heading', { name: 'Backend Engineer Node.js' })).toBeVisible();
  await expect(page.getByRole('meter', { name: /^Match: \d+%$/ })).toBeVisible();
  await expect(page.getByRole('table', { name: /vacante vs\. tú/i })).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Fortalezas' })).toBeVisible();
  await expect(page.getByText(/La IA no decide/)).toBeVisible();
});

test('E2E-03 · listado y búsqueda de vacantes', async ({ page }) => {
  await page.goto('/jobs');
  await expect(page.getByRole('heading', { name: 'Vacantes' })).toBeVisible();
  await page.getByLabel('Buscar vacantes').fill('python fintech');
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page.getByRole('link', { name: 'Data Scientist', exact: true })).toBeVisible();
});

test('E2E-04 · flujo completo candidata ↔ reclutador', async ({ page, request }) => {
  // 1. Sofía sube su CV y confirma las skills propuestas por la IA.
  await loginAs(page, /Sofía · candidata nueva/);
  await page.goto('/c/profile');
  await page.getByLabel('Pega el texto de tu CV').fill(CV);
  await page.getByRole('button', { name: /Extraer skills con IA/ }).click();
  const confirm = page.getByRole('button', { name: /^Confirmar \d+ skills?$/ });
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByText('Skills confirmadas. Tu match se recalculó.')).toBeVisible();

  // 2. Elige una vacante a la que aún no se haya postulado (re-ejecutable).
  const token = await page.evaluate(() => localStorage.getItem('nexo.token'));
  const auth = { Authorization: `Bearer ${token}` };
  const dash = await (await request.get('/v1/bff/candidate/dashboard', { headers: auth })).json();
  const applied = new Set(dash.applications.map((a: { jobId: string }) => a.jobId));
  // Vacantes de Fintech o Retail: el paso 4 usa a sus reclutadores (Rubén y Rita).
  const fetchOrg = async (q: string) => (await (await request.get(`/v1/jobs?q=${q}&pageSize=50`)).json()).items as { id: string; title: string; organizationName: string }[];
  const jobs = [...(await fetchOrg('fintech')), ...(await fetchOrg('retail'))];
  const target = jobs.find((j) => !applied.has(j.id) && /Fintech|Retail/.test(j.organizationName));
  test.skip(!target, 'Sofía ya se postuló a todas las vacantes: ejecuta `make db-seed`');

  // 3. Postula desde el detalle y ve el stepper en su dashboard.
  await page.goto(`/jobs/${target!.id}`);
  await page.getByRole('button', { name: 'Postular' }).click();
  await expect(page.getByText(/Te postulaste/)).toBeVisible();
  await page.getByRole('link', { name: 'Ver mi postulación' }).click();
  const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: target!.title, exact: true }) });
  await expect(card.getByRole('list', { name: 'Avance de tu postulación' })).toBeVisible();
  await logout(page);

  // 4. El reclutador dueño de la vacante la pasa a "En revisión".
  for (const recruiter of [/Rubén · reclutador/, /Rita · reclutadora/]) {
    await loginAs(page, recruiter);
    await expect(page.getByRole('heading', { name: 'Dashboard del empleador' })).toBeVisible();
    await page.goto(`/e/jobs/${target!.id}`);
    const group = page.getByRole('group', { name: /Cambiar estatus de Sofía/ });
    if (await group.isVisible({ timeout: 3000 }).catch(() => false)) {
      await group.getByRole('button', { name: 'En revisión' }).click();
      await expect(page.getByText('Estatus actualizado a “En revisión”')).toBeVisible();
      await logout(page);
      break;
    }
    await logout(page);
  }

  // 5. Sofía ve el nuevo estatus y retira la postulación.
  await loginAs(page, /Sofía · candidata nueva/);
  const myCard = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: target!.title, exact: true }) });
  await expect(myCard).toContainText('En revisión');
  // Puede llegar el toast de la notificación; se cierra para no tapar el botón.
  await page.getByRole('button', { name: 'Cerrar notificación' }).first().click({ timeout: 2000 }).catch(() => undefined);
  page.once('dialog', (d) => d.accept());
  await myCard.getByRole('button', { name: 'Retirar postulación' }).click();
  await expect(myCard).toContainText('Retirado');
});

test('E2E-05 · el empleador ve postulaciones estancadas y no accede a rutas de candidato', async ({ page }) => {
  await loginAs(page, /Rita · reclutadora/);
  await expect(page.getByRole('heading', { name: 'Postulaciones sin movimiento' })).toBeVisible();
  // Con los datos sembrados hay una postulación de 6 días (urgente); si alguien ya la movió, se muestra «Todo al día».
  await expect(page.getByText(/días · urgente|Todo al día/).first()).toBeVisible();
  await page.goto('/c/profile');
  await expect(page).toHaveURL(/\/e\/dashboard$/);
});

test('E2E-06 · lista de vacantes con filtros facetados sincronizados con la URL', async ({ page }) => {
  await page.goto('/jobs');
  const filters = page.getByRole('complementary', { name: 'Filtros' });
  // Los filtros viven en la URL (React Router actualiza en una transición): clic y luego se espera el estado.
  await expect(filters.getByRole('checkbox', { name: /Remoto/ })).toBeEnabled();
  await filters.getByRole('checkbox', { name: /Remoto/ }).click();
  await expect(filters.getByRole('checkbox', { name: /Remoto/ })).toBeChecked();
  await filters.getByRole('checkbox', { name: /Senior/ }).click();
  await expect(filters.getByRole('checkbox', { name: /Senior/ })).toBeChecked();
  await expect(page).toHaveURL(/modality=remote/);
  await expect(page.locator('.results-count')).toHaveText('14 vacantes');
  await filters.getByRole('button', { name: /^AWS/ }).click();
  await expect(page.locator('.results-count')).toHaveText('9 vacantes');
  await page.getByRole('combobox', { name: 'Ordenar por' }).selectOption('salary_desc');
  await expect(page.locator('.job-row').first()).toContainText('Machine Learning Engineer');

  // La URL es compartible: al recargar se conservan los filtros.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Quitar filtro AWS' })).toBeVisible();
  await page.getByRole('button', { name: 'Limpiar todo' }).click();
  await expect(page.locator('.results-count')).toHaveText('100 vacantes');
  await expect(page.getByText('Página 1 de 10')).toBeVisible();

  // Vacantes urgentes: filtro y marca 🔥.
  await page.getByRole('checkbox', { name: /Solo vacantes urgentes/ }).click();
  await expect(page.locator('.results-count')).toHaveText('18 vacantes');
  await expect(page.locator('.job-row').first().getByText('Urgente')).toBeVisible();
});
