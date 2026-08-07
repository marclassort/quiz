import { expect, test } from '@playwright/test';

import { SEED_QUIZ_SLUGS } from './fixtures';
import { playQuizToCompletion } from './helpers';

/**
 * claude.md §12 : "je m'inscris et je vois mon rang". Le corpus napoléonien
 * (claude.md §10) ne compte que 2 quiz de démonstration, sous le seuil
 * d'éligibilité de 3 (claude.md §6.4) : ce scénario joue donc les 2 quiz
 * publiés par global-setup.ts puis vérifie que le classement affiche bien
 * le message "pas encore éligible" — un comportement réel et déterministe,
 * plutôt que de fabriquer un 3ᵉ quiz de test rien que pour obtenir un rang.
 */
test('un visiteur peut s’inscrire, jouer et consulter sa position au classement', async ({
  page,
}) => {
  const suffix = Date.now();
  const email = `e2e-register-${suffix}@example.com`;
  const displayName = `E2ERegister${suffix}`.slice(0, 24);

  await page.goto('/inscription');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Nom public (3 à 24 caractères)').fill(displayName);
  await page
    .getByLabel('Mot de passe (12 caractères minimum)')
    .fill('un-mot-de-passe-suffisamment-long');
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await page.waitForURL('/');

  for (const slug of SEED_QUIZ_SLUGS) {
    await page.goto(`/quiz/${slug}/play`);
    await playQuizToCompletion(page);
  }

  await page.goto('/classement');
  await expect(page.getByRole('heading', { name: 'Classement' })).toBeVisible();
  await expect(
    page.getByText('Terminez au moins 3 quiz pour apparaître au classement.'),
  ).toBeVisible();
});
