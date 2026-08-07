import { defineConfig, devices } from '@playwright/test';

/**
 * Suite E2E (claude.md §12) : 3 scénarios obligatoires (jeu sans compte,
 * inscription + classement, admin crée/publie). Exécution séquentielle —
 * les specs partagent le même compte admin et les mêmes quiz publiés par
 * global-setup.ts, un parallélisme non maîtrisé les ferait interférer.
 *
 * Prérequis (non démarrés par cette config) : Postgres via
 * `docker compose up -d`, migrations et seed à jour (`pnpm db:migrate`,
 * `pnpm db:seed`). Les serveurs api/web, eux, sont démarrés automatiquement
 * ci-dessous si non déjà lancés.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @quiz/api dev',
      url: 'http://localhost:3000/api/v1/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @quiz/web dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
