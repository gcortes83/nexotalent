/**
 * E2E del change add-accounts-jobs-notifications en un navegador real (sin mocks):
 * landing → registro de empleador y candidato → vacante creada y publicada → CV en archivo →
 * postulación → preselección (toast + marca) → cierre de la vacante (toast + marca) → login con contraseña.
 * Usa correos únicos por corrida, así que es re-ejecutable.
 */
import { expect, type Page, test } from '@playwright/test';

const run = Date.now().toString(36);
const employer = { company: `Logística E2E ${run}`, name: 'Elena Empleadora', email: `empresa-${run}@example.com`, password: 'Segura123' };
const candidate = { name: 'Carla Candidata', email: `carla-${run}@example.com`, password: 'Segura123' };
const JOB_TITLE = `QA Automation ${run}`;
const CV = `Carla Candidata — QA Engineer.
Experiencia avanzada en testing automatizado con Playwright y TypeScript.
Uso diario de SQL y Git; nociones de Docker. Inglés intermedio.`;

test.describe.configure({ mode: 'serial' });

async function logout(page: Page) {
  await page.getByRole('button', { name: /^Salir/ }).click();
  await expect(page.getByRole('link', { name: 'Entrar', exact: true })).toBeVisible();
}

async function passwordLogin(page: Page, tab: 'Candidato' | 'Empleador', email: string, password: string) {
  await page.goto('/login');
  await page.getByRole('tab', { name: tab }).click();
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: tab === 'Candidato' ? 'Entrar como candidato' : 'Entrar como empleador' }).click();
  // El token se guarda al completar el login: espera la redirección antes de navegar.
  await page.waitForURL(/\/(c|e)\/dashboard$/);
}

test('E2E-10 · la landing ofrece registro de candidatos, empleadores y vacantes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('explicado skill por skill');
  await expect(page.getByRole('link', { name: 'Registrarme como candidato' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Registrar mi empresa' })).toBeVisible();
  await page.getByRole('link', { name: 'Ver vacantes' }).click();
  await expect(page).toHaveURL(/\/jobs$/);
});

test('E2E-11 · /login sin parámetro pide correo y contraseña; ?demo=1 muestra las cuentas de demo', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('tab', { name: 'Candidato' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('Contraseña')).toBeVisible();
  await page.goto('/login?demo=1');
  await expect(page.getByRole('list', { name: 'Cuentas de demo' })).toBeVisible();
});

test('E2E-12 · empleador se registra, crea y publica una vacante', async ({ page }) => {
  await page.goto('/registro/empleador');
  await page.getByLabel('Nombre de la empresa').fill(employer.company);
  await page.getByLabel('Tu nombre').fill(employer.name);
  await page.getByLabel('Correo de trabajo').fill(employer.email);
  await page.getByLabel('Contraseña').fill(employer.password);
  await page.getByRole('checkbox', { name: /aviso de privacidad/ }).check();
  await page.getByRole('button', { name: 'Crear cuenta de empleador' }).click();
  await expect(page).toHaveURL(/\/e\/vacantes/);

  await page.getByRole('link', { name: '＋ Nueva vacante' }).click();
  await page.getByLabel('Título').fill(JOB_TITLE);
  await page.getByLabel('Descripción').fill('Automatización de pruebas E2E y de API para un equipo de logística.');
  await page.getByLabel('Seniority').selectOption('mid');
  for (const skill of ['Testing automatizado', 'TypeScript', 'SQL']) {
    await page.getByLabel('Agregar skill requerida').selectOption({ label: skill });
    await page.getByRole('group', { name: 'Skills requeridas' }).getByRole('button', { name: 'Agregar', exact: true }).click();
  }
  await page.getByRole('checkbox', { name: 'Obligatoria' }).first().check();
  // Soft skills opcionales en su propia sección (se muestran en verde).
  const soft = page.getByRole('group', { name: 'Soft skills (opcional)' });
  await soft.getByLabel('Agregar soft skill').selectOption({ label: 'Comunicación' });
  await soft.getByRole('button', { name: 'Agregar', exact: true }).click();
  await page.getByRole('button', { name: 'Publicar vacante' }).click();

  await expect(page).toHaveURL(/\/e\/vacantes$/);
  const row = page.getByRole('row').filter({ hasText: JOB_TITLE });
  await expect(row.getByText('Publicada')).toBeVisible();
  await logout(page);
});

test('E2E-13 · candidata se registra, sube su CV en archivo, confirma skills y se postula', async ({ page }) => {
  await page.goto('/registro/candidato');
  await page.getByLabel('Nombre completo').fill(candidate.name);
  await page.getByLabel('Correo').fill(candidate.email);
  await page.getByLabel('Contraseña').fill(candidate.password);
  await page.getByRole('checkbox', { name: /aviso de privacidad/ }).check();
  await page.getByRole('button', { name: 'Crear cuenta de candidato' }).click();
  await expect(page).toHaveURL(/\/c\/profile/);

  await page.getByLabel('Seniority').selectOption('mid');
  await page.getByRole('button', { name: 'Guardar mis datos' }).click();
  await expect(page.getByText('Datos actualizados. Tu match se recalculó.')).toBeVisible();

  await page.getByLabel(/Sube tu CV/).setInputFiles({ name: 'cv.txt', mimeType: 'text/plain', buffer: Buffer.from(CV) });
  const confirm = page.getByRole('button', { name: /^Confirmar \d+ skills?$/ });
  await expect(confirm).not.toHaveText('Confirmar 0 skills');
  await confirm.click();
  await expect(page.getByText('Skills confirmadas. Tu match se recalculó.')).toBeVisible();

  await page.goto('/jobs');
  await page.getByLabel('Buscar vacantes').fill(JOB_TITLE);
  await page.getByRole('button', { name: 'Buscar' }).click();
  await page.getByRole('link', { name: JOB_TITLE, exact: true }).click();
  await expect(page.getByRole('meter', { name: /^Match: \d+%$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Postular' }).click();
  await expect(page.getByText(/Te postulaste/)).toBeVisible();
  await logout(page);
});

test('E2E-14 · el empleador preselecciona: la candidata ve el toast y la marca «Seleccionado»', async ({ page }) => {
  await passwordLogin(page, 'Empleador', employer.email, employer.password);
  await expect(page).toHaveURL(/\/e\/dashboard$/);
  await page.goto('/e/vacantes');
  await page.getByRole('row').filter({ hasText: JOB_TITLE }).getByRole('link', { name: 'Candidatos' }).click();
  const group = page.getByRole('group', { name: `Cambiar estatus de ${candidate.name}` });
  await group.getByRole('button', { name: 'En revisión' }).click();
  await expect(page.getByText('Estatus actualizado a “En revisión”')).toBeVisible();
  await group.getByRole('button', { name: 'Preseleccionado' }).click();
  await expect(page.getByText('Estatus actualizado a “Preseleccionado”')).toBeVisible();
  await logout(page);

  await passwordLogin(page, 'Candidato', candidate.email, candidate.password);
  await expect(page.getByTestId('toast').filter({ hasText: '¡Fuiste preseleccionado!' })).toBeVisible();
  await page.goto('/c/profile');
  const row = page.getByRole('row').filter({ hasText: JOB_TITLE });
  await expect(row.getByText(/Seleccionado/)).toBeVisible();
  await logout(page);
});

test('E2E-15 · el empleador cierra la vacante: la candidata ve el toast y la marca «Vacante cerrada»', async ({ page }) => {
  await passwordLogin(page, 'Empleador', employer.email, employer.password);
  await page.goto('/e/vacantes');
  const row = page.getByRole('row').filter({ hasText: JOB_TITLE });
  page.once('dialog', (d) => d.accept());
  await row.getByRole('button', { name: 'Cerrar vacante' }).click();
  await expect(page.getByText(/Avisamos a 1 candidato/)).toBeVisible();
  await expect(row.getByText('Cerrada')).toBeVisible();
  await logout(page);

  await passwordLogin(page, 'Candidato', candidate.email, candidate.password);
  await expect(page.getByTestId('toast').filter({ hasText: 'Vacante cerrada' })).toBeVisible();
  await page.goto('/c/profile');
  await expect(page.getByRole('row').filter({ hasText: JOB_TITLE }).getByText('Vacante cerrada')).toBeVisible();
});

test('E2E-16 · el empleador importa vacantes desde CSV', async ({ page }) => {
  await passwordLogin(page, 'Empleador', employer.email, employer.password);
  await page.goto('/e/importar');
  const csv = `externalId,title,description,seniority,modality,country,city,salaryMin,salaryMax,currency,positions,skills
E2E-${run}-1,Data Engineer ${run},"Pipelines de datos batch y streaming.",senior,remote,MX,,4500,5500,USD,1,"Python:4:must;SQL:4"
E2E-${run}-2,Sin descripción,,mid,remote,MX,,,,USD,1,SQL:3`;
  await page.getByLabel(/Archivo CSV/).setInputFiles({ name: 'vacantes.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.getByRole('button', { name: '⇪ Importar' }).click();
  await expect(page.getByRole('status')).toContainText('1 creadas · 0 actualizadas · 1 con errores');
  await expect(page.getByText(/Fila 2:/)).toBeVisible();
});
