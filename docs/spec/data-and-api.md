# Spec — Modèle de données et API

Nommage Prisma en PascalCase, colonnes en camelCase, tables SQL en snake_case.

## 1. Comptes et catalogue

**User** — `id (uuid)`, `email (unique, citext)`, `passwordHash (argon2id)`, `displayName (unique, 3-24 car.)`, `role (enum: USER | ADMIN)`, `emailVerifiedAt`, `hiddenFromLeaderboard (bool, défaut false)`, `createdAt`, `updatedAt`, `deletedAt (soft delete)`.

**Theme** — `id`, `slug (unique)`, `name`, `description`, `position`.

**Quiz** — `id`, `themeId`, `slug (unique)`, `title`, `description`, `difficulty (enum: EASY | MEDIUM | HARD)`, `status (enum: DRAFT | PUBLISHED | ARCHIVED)`, `gameMode (enum: CLASSIC | GEO)`, `config (jsonb, validé par un schéma Zod propre au mode)`, `timeLimitSeconds (nullable)`, `questionCount`, `publishedAt`, `createdAt`, `updatedAt`.

**Question** — `id`, `quizId`, `position`, `type (enum: SINGLE_CHOICE | MULTIPLE_CHOICE | TRUE_FALSE | FREE_TEXT | MAP_CLICK | MAP_PLACE)`, `statement`, `payload (jsonb)`, `imageUrl (nullable)`, `points (int, défaut 1)`, `explanation`, `source (obligatoire)`, `createdAt`, `updatedAt`.

Le champ `payload` porte tout ce qui est spécifique au type. **Jamais de colonne nullable supplémentaire par type.** Il est validé par un schéma Zod discriminé sur `type`, défini dans `packages/shared` et utilisé des deux côtés.

**Choice** (types à choix) — `id`, `questionId`, `position`, `label`, `isCorrect (bool)`.

**AcceptedAnswer** (`FREE_TEXT`) — `id`, `questionId`, `value`, `isPrimary (bool)`. Plusieurs variantes par question (ex. « Austerlitz », « bataille d'Austerlitz », « bataille des Trois Empereurs »).

## 2. Charges utiles cartographiques

**`MAP_CLICK`** — cliquer la bonne entité :
`{ datasetId, datasetVersion, featureIds: string[], prompt, distractorPolicy }`.
La réponse soumise est un identifiant de feature ; la validation est un test d'appartenance serveur.

**`MAP_PLACE`** — placer un point (ville, capitale) :
`{ datasetId, datasetVersion, targetLat, targetLng, toleranceKm, scoringCurve }`.
La réponse soumise est un couple latitude/longitude ; le score dérive de la distance orthodromique calculée serveur. `targetLat` et `targetLng` ne sortent jamais vers le client avant soumission.

**GeoDataset** — `id`, `slug (unique)`, `name`, `kind (enum: COUNTRY | CAPITAL | CITY | RIVER | LAKE | ADMIN_FR | OTHER)`, `scope`, `sourceName`, `sourceUrl`, `license`, `attributionText`, `version`, `updatedAt`.

Les géométries sont servies en TopoJSON depuis des fichiers statiques versionnés (`apps/web/public/geo/<slug>/<version>.topojson`), pas depuis la base — sauf besoin avéré de requête spatiale, justifié par ADR.

## 3. Parties

**Attempt** — `id`, `quizId`, `userId (nullable)`, `guestToken (nullable, uuid)`, `startedAt`, `finishedAt (nullable)`, `score`, `maxScore`, `durationMs`, `countsForRanking (bool)`.
Contrainte : `userId` XOR `guestToken` non nul.

**AttemptAnswer** — `id`, `attemptId`, `questionId`, `submittedAt`, `rawAnswer (jsonb : ids de choix, texte brut, id de feature ou coordonnées)`, `isCorrect (bool)`, `pointsEarned`, `answerTimeMs`, `datasetVersion (nullable)`.

**AnswerReview** (file de modération) — `id`, `questionId`, `submittedText`, `occurrences (int)`, `status (enum: PENDING | ACCEPTED | REJECTED)`, `reviewedBy`, `reviewedAt`.

**UserStats** (table dérivée, recalculée) — `userId`, `totalScore`, `quizzesCompleted`, `correctAnswers`, `totalAnswers`, `averageAccuracy`, `lastPlayedAt`, `updatedAt`.

**Index attendus** : `Attempt(userId, quizId)`, `Attempt(guestToken)`, `Question(quizId, position)`, `Question(quizId, type)`, `UserStats(totalScore DESC)`.

## 4. API REST

Préfixe `/api/v1`. Erreurs au format RFC 9457 (`application/problem+json`).

**Public**

- `GET /themes`, `GET /themes/:slug`
- `GET /quizzes?theme=&difficulty=&gameMode=&page=`, `GET /quizzes/:slug`
- `POST /quizzes/:slug/attempts` → crée un `Attempt` (anonyme ou authentifié), renvoie la première question
- `GET /attempts/:id/questions/current` → question courante, expurgée de toute information de correction
- `POST /attempts/:id/answers` → `{ questionId, answer }` → `{ isCorrect, correctAnswer, explanation, pointsEarned, distanceKm?, nextQuestionId | null }`
- `POST /attempts/:id/finish` → récapitulatif
- `GET /geo/datasets/:slug` → métadonnées et attribution (les géométries sont servies en statique, URL versionnée, cache longue durée)
- `GET /leaderboard?scope=global|theme|30d&themeSlug=&page=`

**Auth**

- `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`
- `POST /auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password`

**Utilisateur connecté**

- `GET /me`, `PATCH /me`, `DELETE /me` (suppression RGPD), `GET /me/export` (export JSON)
- `GET /me/attempts?page=`, `GET /me/stats`, `GET /me/rank`

**Admin (`ADMIN` requis)**

- CRUD `/admin/themes`, `/admin/quizzes`, `/admin/questions`, `/admin/questions/:id/choices`, `/admin/questions/:id/accepted-answers`
- `PUT /admin/questions/:id/payload` (validation Zod par type)
- `POST /admin/quizzes/:id/publish` / `unpublish`
- `GET /admin/answer-reviews?status=pending`, `POST /admin/answer-reviews/:id/accept|reject`
- `GET /admin/geo-datasets`, `POST /admin/geo-datasets`, `POST /admin/geo-datasets/:id/import`
- `POST /admin/quizzes/import`, `GET /admin/quizzes/:id/export` (format JSON documenté)
- `GET /admin/stats` (nombre de parties, taux de réussite par question)
