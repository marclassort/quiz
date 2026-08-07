import type { Page } from '@playwright/test';

/**
 * Répond à toutes les questions d'une partie en cours (page
 * `/quiz/:slug/play`) jusqu'à la page de résultat. Le contenu de la
 * réponse n'importe pas pour ces scénarios E2E — seul le parcours compte,
 * la justesse de la correction est déjà couverte par les tests
 * d'intégration API (claude.md §12).
 */
export async function playQuizToCompletion(page: Page): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    if (/\/result\//.test(page.url())) return;

    const hasFieldset = await page.locator('fieldset').count();
    if (hasFieldset > 0) {
      const freeTextInput = page.locator('form input[type=text]');
      if ((await freeTextInput.count()) > 0) {
        await freeTextInput.first().fill('test');
      } else {
        await page
          .locator('fieldset input[type=radio], fieldset input[type=checkbox]')
          .first()
          .check();
      }
      await page.getByRole('button', { name: 'Valider ma réponse' }).click();
      await page.waitForSelector('text=/Bonne réponse|Réponse incorrecte/');
      await page.getByRole('button', { name: 'Continuer' }).click();
    }
    await page.waitForTimeout(200);
  }

  await page.waitForURL('**/result/**');
}
