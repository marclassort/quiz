import { Client } from 'pg';

import {
  DATABASE_URL,
  API_BASE_URL,
  E2E_ADMIN_DISPLAY_NAME,
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  SEED_QUIZ_SLUGS,
} from './fixtures';

/**
 * Prépare les données nécessaires aux 3 scénarios E2E (claude.md §12) :
 * - un compte ADMIN (le rôle ne s'attribue qu'en base, claude.md §5 — pas
 *   de route API pour ça, volontairement) ;
 * - les quiz du seed napoléonien publiés, pour permettre à un visiteur/un
 *   nouvel inscrit d'y jouer sans dépendre du scénario admin.
 *
 * Passe directement par Postgres plutôt que par le seul HTTP : c'est la
 * seule façon d'attribuer le rôle ADMIN (par design, cf. §5) et la manière
 * la plus fiable de republier un état de départ identique à chaque run.
 */
export default async function globalSetup(): Promise<void> {
  const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: E2E_ADMIN_EMAIL,
      password: E2E_ADMIN_PASSWORD,
      displayName: E2E_ADMIN_DISPLAY_NAME,
    }),
  });

  // 201 (créé) ou 409 (déjà créé par un run précédent non nettoyé) sont
  // tous deux des issues acceptables ici : dans les deux cas l'utilisateur
  // existe ensuite en base pour la mise à jour du rôle.
  if (!registerResponse.ok && registerResponse.status !== 409) {
    throw new Error(
      `Échec de création du compte admin E2E : ${registerResponse.status} ${await registerResponse.text()}`,
    );
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query('UPDATE users SET role = $1 WHERE email = $2', ['ADMIN', E2E_ADMIN_EMAIL]);
    await client.query(
      `UPDATE quizzes SET status = 'PUBLISHED', published_at = COALESCE(published_at, NOW())
       WHERE slug = ANY($1::text[])`,
      [SEED_QUIZ_SLUGS],
    );
  } finally {
    await client.end();
  }
}
