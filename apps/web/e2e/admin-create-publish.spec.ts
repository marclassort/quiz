import { expect, test } from '@playwright/test';

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './fixtures';

/**
 * claude.md §12 : "admin crée et publie une question". La publication
 * s'effectue au niveau du quiz (claude.md §9 : blocage si une question n'a
 * pas de source/explication), donc ce scénario crée thème + quiz + question
 * complète, puis publie le quiz.
 */
test('un admin crée un thème, un quiz, une question et publie', async ({ page }) => {
  const suffix = Date.now();

  await page.goto('/connexion');
  await page.getByLabel('Email').fill(E2E_ADMIN_EMAIL);
  await page.getByLabel('Mot de passe').fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('/');

  // Thème
  await page.goto('/admin/themes');
  await page.getByRole('button', { name: 'Créer un thème' }).click();
  const themeSlug = `e2e-theme-${suffix}`;
  await page.getByLabel('Slug').fill(themeSlug);
  await page.getByLabel('Nom').fill('Thème E2E');
  await page.getByLabel('Description').fill('Thème créé par la suite E2E.');
  await page.getByLabel('Position').fill('99');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText(themeSlug)).toBeVisible();

  // Quiz
  await page.goto('/admin/quizzes');
  await page.getByRole('button', { name: 'Créer un quiz', exact: true }).click();
  const createQuizForm = page.locator('form').filter({ hasText: 'Slug' });
  await createQuizForm.getByLabel('Thème').selectOption({ label: 'Thème E2E' });
  const quizSlug = `e2e-quiz-${suffix}`;
  await createQuizForm.getByLabel('Slug').fill(quizSlug);
  await createQuizForm.getByLabel('Titre').fill('Quiz E2E');
  await createQuizForm.getByLabel('Description').fill('Quiz créé par la suite E2E.');
  await createQuizForm.getByRole('button', { name: 'Enregistrer' }).click();
  await page.waitForURL('**/admin/quizzes/*');

  // Question à choix unique
  await page.getByRole('button', { name: 'Ajouter une question' }).click();
  const addQuestionForm = page.locator('form').filter({ hasText: 'Type' });
  await addQuestionForm.getByLabel('Type').selectOption('SINGLE_CHOICE');
  await addQuestionForm.getByLabel('Énoncé').fill('Question E2E : 2 + 2 ?');
  await addQuestionForm.getByRole('button', { name: 'Enregistrer' }).click();
  await page.waitForURL('**/admin/questions/*');

  await page.getByLabel('Nouveau choix').fill('4');
  await page.getByLabel('Correct').check();
  await page.getByRole('button', { name: 'Ajouter un choix' }).click();
  await page.waitForTimeout(300);
  await page.getByLabel('Nouveau choix').fill('5');
  await page.getByRole('button', { name: 'Ajouter un choix' }).click();
  await page.waitForTimeout(300);

  await page.getByLabel('Explication').fill('2 + 2 = 4, arithmétique de base.');
  await page.getByLabel('Source').fill('Suite E2E — question de test.');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Question mise à jour.')).toBeVisible();

  // Publication du quiz
  await page.goBack();
  await page.waitForURL('**/admin/quizzes/*');
  await page.getByRole('button', { name: 'Publier' }).click();
  await expect(page.getByText('Publié')).toBeVisible();
});
