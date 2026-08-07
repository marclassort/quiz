import { expect, test } from '@playwright/test';

import { playQuizToCompletion } from './helpers';

/**
 * claude.md §12 : "je joue un quiz sans compte". Parcours anonyme complet
 * jusqu'au récapitulatif, avec l'encart d'incitation à l'inscription
 * (claude.md §4.2).
 */
test('un visiteur peut jouer un quiz complet sans compte', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Période napoléonienne' }).click();
  await page.waitForURL('**/themes/**');

  await page.getByRole('link', { name: 'Les grandes batailles napoléoniennes' }).click();
  await page.waitForURL('**/quiz/**');

  await page.getByRole('button', { name: 'Commencer le quiz' }).click();
  await page.waitForURL('**/play');

  await playQuizToCompletion(page);

  await expect(page.getByRole('heading', { name: 'Résultat' })).toBeVisible();
  await expect(page.getByText(/Bonnes réponses/)).toBeVisible();

  // Encart d'incitation à l'inscription (claude.md §4.2), visible car anonyme.
  await expect(
    page.getByText('Créez un compte pour conserver vos résultats et entrer au classement.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Créer mon compte' })).toBeVisible();
});
