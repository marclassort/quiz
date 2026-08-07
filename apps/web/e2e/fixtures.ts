/**
 * Constantes partagées entre le setup/teardown global et les specs E2E
 * (claude.md §12). Un seul jeu de fixtures pour toute la suite : les tests
 * ne tournent pas en parallèle (cf. playwright.config.ts) pour rester
 * déterministes vis-à-vis de ces données partagées.
 */
export const E2E_ADMIN_EMAIL = 'e2e-admin@example.com';
export const E2E_ADMIN_PASSWORD = 'un-mot-de-passe-suffisamment-long-e2e';
export const E2E_ADMIN_DISPLAY_NAME = 'E2E Admin';

/** Quiz du seed napoléonien (claude.md §10), publiés par le setup global
 * pour les scénarios "je joue sans compte" / "je m'inscris". */
export const SEED_QUIZ_SLUGS = [
  'grandes-batailles-napoleoniennes',
  'institutions-dates-cles-empire',
];

export const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://quiz:quiz@localhost:5433/quiz?schema=public';

export const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://localhost:3000/api/v1';
