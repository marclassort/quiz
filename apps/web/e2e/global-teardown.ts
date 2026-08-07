import { Client } from 'pg';

import { DATABASE_URL, E2E_ADMIN_EMAIL, SEED_QUIZ_SLUGS } from './fixtures';

/**
 * Restaure l'état de départ après la suite E2E : les quiz du seed
 * repassent en DRAFT (claude.md §10 — rien n'est publié avant relecture
 * humaine ; la publication n'était qu'un besoin des tests), et toutes les
 * données créées par les specs sont supprimées.
 *
 * Les Attempt liés aux quiz du seed sont purgés sans distinction
 * anonyme/inscrit : en usage normal ces quiz restent en DRAFT (donc
 * injouables) en dehors de cette suite, ce nettoyage n'affecte donc que les
 * parties générées par ce run E2E.
 */
export default async function globalTeardown(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const { rows: seedQuizzes } = await client.query<{ id: string }>(
      'SELECT id FROM quizzes WHERE slug = ANY($1::text[])',
      [SEED_QUIZ_SLUGS],
    );
    const seedQuizIds = seedQuizzes.map((q) => q.id);

    if (seedQuizIds.length > 0) {
      await client.query(
        `DELETE FROM attempt_answers WHERE attempt_id IN (
           SELECT id FROM attempts WHERE quiz_id = ANY($1::uuid[])
         )`,
        [seedQuizIds],
      );
      await client.query('DELETE FROM attempts WHERE quiz_id = ANY($1::uuid[])', [seedQuizIds]);
    }

    await client.query(`UPDATE quizzes SET status = 'DRAFT' WHERE slug = ANY($1::text[])`, [
      SEED_QUIZ_SLUGS,
    ]);

    // Quiz/thèmes créés par les specs (convention de préfixe "e2e-").
    await client.query(`DELETE FROM quizzes WHERE slug LIKE 'e2e-%'`);
    await client.query(`DELETE FROM themes WHERE slug LIKE 'e2e-%'`);

    const { rows: users } = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE email LIKE 'e2e-%@example.com' OR email = $1`,
      [E2E_ADMIN_EMAIL],
    );
    const userIds = users.map((u) => u.id);
    if (userIds.length > 0) {
      await client.query('DELETE FROM refresh_tokens WHERE user_id = ANY($1::uuid[])', [userIds]);
      await client.query('DELETE FROM user_stats WHERE user_id = ANY($1::uuid[])', [userIds]);
      await client.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [userIds]);
    }
  } finally {
    await client.end();
  }
}
