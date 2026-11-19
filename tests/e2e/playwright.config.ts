import { defineConfig, devices } from '@playwright/test';

/**
 * E2E en navegador contra la app YA levantada (make start o make docker-up).
 *   make test-e2e                          → WEB_URL=http://localhost:5173
 *   make test-e2e WEB_URL=http://localhost:8080
 * Usa Google Chrome instalado (PW_CHANNEL=chrome) o Chromium de Playwright (PW_CHANNEL=chromium).
 */
export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: [['list'], ['html', { outputFolder: '../../playwright-report', open: 'never' }]],
  outputDir: '../../test-results',
  use: {
    baseURL: process.env.WEB_URL ?? 'http://localhost:5173',
    locale: 'es-MX',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL ?? 'chrome' },
    },
  ],
});
