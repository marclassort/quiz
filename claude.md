## 0. Rôle et objectif

Tu es un développeur full-stack senior spécialisé en **Vue 3 (Composition API + TypeScript)** et en API REST typées. Tu construis une application web de quiz sur l'histoire de France, dont le premier corpus porte sur la période napoléonienne (Consulat et Empire, 1799-1815).

Contraintes de méthode :

- Tu écris du code **production-ready**, typé, testé, commenté uniquement là où l'intention n'est pas évidente.
- Avant chaque lot de travail, tu proposes un plan court et tu attends validation.
- Tu ne modifies jamais plus de fichiers que nécessaire, et tu ne refactores pas d'existant sans le signaler.
- Si une spécification ci-dessous est ambiguë ou contradictoire, **tu poses la question au lieu de deviner**.
- Tu n'inventes aucun contenu historique (voir § 10).

## 1. Stack technique imposée

**Monorepo** géré avec pnpm workspaces :

```
/apps/web        → front Vue 3
/apps/api        → backend
/packages/shared → types TypeScript + schémas Zod partagés front/back
```

**Front (`apps/web`)**

- Vue 3 (dernière 3.5.x stable ; **ne pas** utiliser Vapor Mode ni les beta 3.6), `<script setup>` + Composition API, TypeScript strict.
- Vite (v7), Vue Router (routes typées), Pinia (v3) pour l'état client.
- Pinia Colada (ou TanStack Query Vue) pour l'état serveur : cache, dédoublonnage, invalidation.
- Tailwind CSS + un set de composants maison minimal (pas de grosse librairie UI).
- Vitest + Vue Test Utils pour l'unitaire, Playwright pour l'E2E.
- Vérifie les versions réellement disponibles au moment de l'installation ; ne pin rien à l'aveugle.

**Back (`apps/api`)**

- Node.js LTS + **NestJS** (architecture modulaire, injection de dépendances, DTO validés — les concepts sont proches de Symfony : modules ≈ bundles, providers ≈ services, guards ≈ voters/firewall).
- **PostgreSQL** + **Prisma** (migrations versionnées, seed scripts).
- Validation d'entrée avec Zod (schémas partagés depuis `packages/shared`).
- OpenAPI généré automatiquement, exposé en dev sur `/api/docs`.

**Transverse**

- ESLint + Prettier, `typescript` en mode `strict`, pas de `any` non justifié.
- Docker Compose pour PostgreSQL en local ; `.env.example` documenté.
- Aucune clé, aucun secret en dur dans le code.

> *Variante possible (voir § 15) : backend Symfony 7 + API Platform si l'on préfère capitaliser sur PHP. Dans ce cas, seule la section « Back » change ; le modèle de données, les règles métier et le front restent identiques.*

## 2. Architecture fonctionnelle en une phrase

Un visiteur anonyme peut jouer immédiatement à n'importe quel quiz publié ; un utilisateur inscrit voit en plus son historique, ses statistiques et sa position dans un classement global ; un administrateur gère le catalogue de quiz et de questions via un back-office.

## 3. Modèle de données

Tables (nommage Prisma en PascalCase, colonnes en camelCase, table SQL en snake_case) :

**User**
`id (uuid)`, `email (unique, citext)`, `passwordHash (argon2id)`, `displayName (unique, 3-24 car.)`, `role (enum: USER | ADMIN)`, `emailVerifiedAt`, `createdAt`, `updatedAt`, `deletedAt (soft delete)`.

**Theme** (ex. « Période napoléonienne »)
`id`, `slug (unique)`, `name`, `description`, `position`.

**Quiz**
`id`, `themeId`, `slug (unique)`, `title`, `description`, `difficulty (enum: EASY | MEDIUM | HARD)`, `status (enum: DRAFT | PUBLISHED | ARCHIVED)`, `timeLimitSeconds (nullable)`, `questionCount`, `publishedAt`, `createdAt`, `updatedAt`.

**Question**
`id`, `quizId`, `position`, `type (enum: SINGLE_CHOICE | MULTIPLE_CHOICE | TRUE_FALSE | FREE_TEXT)`, `statement (texte)`, `imageUrl (nullable)`, `points (int, défaut 1)`, `explanation (texte, affiché après réponse)`, `source (texte obligatoire, cf. § 10)`, `createdAt`, `updatedAt`.

**Choice** (pour les types à choix)
`id`, `questionId`, `position`, `label`, `isCorrect (bool)`.

**AcceptedAnswer** (pour `FREE_TEXT`)
`id`, `questionId`, `value`, `isPrimary (bool)` — plusieurs variantes acceptées par question (ex. « Austerlitz », « bataille d'Austerlitz », « bataille des Trois Empereurs »).

**Attempt** (une session de jeu)
`id`, `quizId`, `userId (nullable)`, `guestToken (nullable, uuid)`, `startedAt`, `finishedAt (nullable)`, `score (int)`, `maxScore (int)`, `durationMs`, `countsForRanking (bool)`.
Contrainte : `userId` XOR `guestToken` non nul.

**AttemptAnswer**
`id`, `attemptId`, `questionId`, `submittedAt`, `rawAnswer (jsonb : ids de choix ou texte brut)`, `isCorrect (bool)`, `pointsEarned (int)`, `answerTimeMs`.

**AnswerReview** (file de modération, cf. § 6.3)
`id`, `questionId`, `submittedText`, `occurrences (int)`, `status (enum: PENDING | ACCEPTED | REJECTED)`, `reviewedBy`, `reviewedAt`.

**UserStats** (table dérivée, recalculée — évite un `GROUP BY` sur tout l'historique à chaque affichage)
`userId`, `totalScore`, `quizzesCompleted`, `correctAnswers`, `totalAnswers`, `averageAccuracy`, `lastPlayedAt`, `updatedAt`.

Index attendus : `Attempt(userId, quizId)`, `Attempt(guestToken)`, `Question(quizId, position)`, `UserStats(totalScore DESC)`.

## 4. Parcours anonyme vs. compte

1. **Anonyme** : au premier lancement d'un quiz, l'API crée un `Attempt` avec un `guestToken` (uuid v4) stocké côté client dans un cookie `httpOnly` de 30 jours. Le visiteur voit son score de fin de partie et la correction, mais **pas** d'historique multi-quiz, **pas** de statistiques, **pas** de classement.
2. **Incitation** : à la fin d'une partie anonyme, afficher un encart « Créez un compte pour conserver vos résultats et entrer au classement ».
3. **Réclamation des résultats** : si l'utilisateur s'inscrit alors qu'un `guestToken` valide existe, rattacher ses `Attempt` anonymes à son nouveau compte (transaction : set `userId`, null `guestToken`, recalcul de `UserStats`). Cette bascule doit être idempotente.
4. **Inscrit** : historique complet, page de statistiques (précision par thème, progression dans le temps), classement, possibilité de rejouer un quiz en mode entraînement.

## 5. Authentification et rôles

- Inscription email + mot de passe (argon2id), `displayName` public distinct de l'email — l'email n'est **jamais** exposé dans une réponse d'API publique.
- Politique de mot de passe : longueur minimale 12 caractères, vérification contre une liste de mots de passe compromis (ex. zxcvbn pour le score) plutôt que des règles de complexité arbitraires.
- Session par **cookie `httpOnly`, `Secure`, `SameSite=Lax`** contenant un JWT d'accès court (15 min) + refresh token en rotation stocké en base (révocable). Pas de token en `localStorage`.
- Vérification d'email par lien signé ; réinitialisation de mot de passe par token à usage unique expirant en 1 h.
- Rate limiting sur `/auth/*` (par IP et par compte) et sur la soumission de réponses.
- Rôle `ADMIN` attribué manuellement en base ; guard NestJS sur toutes les routes `/admin/*`, et vérification côté serveur systématique (le masquage de menu côté front n'est pas une protection).

## 6. Règles métier de jeu

### 6.1 Anti-triche (non négociable)

- L'API ne renvoie **jamais** `isCorrect`, `AcceptedAnswer` ni `explanation` avant que la réponse ait été soumise. Les `Choice` sont envoyés sans le drapeau de correction, dans un ordre mélangé et stable pour la durée de l'`Attempt`.
- La correction est **exclusivement serveur**. Aucune logique de scoring dans le front.
- Le chronomètre affiché est indicatif : le temps de référence est celui mesuré côté serveur entre l'envoi de la question et la réception de la réponse.
- Une question déjà répondue dans un `Attempt` ne peut pas être resoumise.

### 6.2 Scoring

- Chaque question vaut `points` (défaut 1, modulable par difficulté).
- `MULTIPLE_CHOICE` : bonne réponse = ensemble exact des bonnes options. Prévoir dans le code un point d'extension pour un barème partiel, mais **implémenter le tout-ou-rien par défaut**.
- Bonus de rapidité : désactivé par défaut, activable par quiz via un flag. Si activé, formule explicite et documentée (par ex. `+50 %` des points si réponse en moins d'un tiers du temps imparti).
- **Un seul essai est comptabilisé par quiz et par utilisateur : le premier** (`countsForRanking = true`). Les essais suivants sont enregistrés en mode entraînement et exclus du classement — sinon le classement récompense la répétition, pas la connaissance.

### 6.3 Correction des réponses libres (`FREE_TEXT`)

Pipeline de comparaison, dans cet ordre :

1. Normalisation : trim, casse basse, suppression des diacritiques (NFD + suppression des marques), suppression de la ponctuation, réduction des espaces multiples, retrait des articles initiaux (`le`, `la`, `les`, `l'`, `d'`, `de`).
2. Comparaison exacte avec chaque `AcceptedAnswer` normalisée.
3. Si échec : distance de Levenshtein tolérante à la faute de frappe, seuil dépendant de la longueur (par ex. ≤ 1 pour 4-7 caractères, ≤ 2 pour 8-12, ≤ 3 au-delà ; pas de tolérance sous 4 caractères).
4. Si toujours échec : réponse comptée fausse, **mais** la chaîne soumise est enregistrée dans `AnswerReview` (avec incrément d'`occurrences`). L'admin peut la promouvoir en `AcceptedAnswer` en un clic depuis le back-office. Le corpus de variantes s'enrichit ainsi de l'usage réel.
5. Ne jamais utiliser de LLM pour corriger à la volée : coût, latence et non-déterminisme incompatibles avec un score.

Côté saisie : champ texte avec `autocomplete="off"`, longueur max 100, et affichage de la réponse attendue + `explanation` après soumission.

### 6.4 Classement

- Classement global par `totalScore` décroissant, départage par `averageAccuracy` puis par date de première inscription.
- Trois vues : **global (all-time)**, **par thème**, **glissant 30 jours**.
- Seuil d'éligibilité : minimum 3 quiz terminés pour apparaître au classement (évite les classements pollués par un seul quiz réussi).
- Pagination + endpoint « ma position » qui renvoie le rang de l'utilisateur et ses 5 voisins, même hors de la première page.
- Affichage du `displayName` uniquement. Un utilisateur peut choisir de ne pas apparaître au classement (case à cocher dans son profil) : il est alors exclu du tableau mais conserve ses stats privées.
- `UserStats` mis à jour de façon transactionnelle à la fin de chaque `Attempt` comptabilisé ; prévoir une commande CLI de recalcul complet (`pnpm --filter api stats:rebuild`) pour réparer une dérive.

## 7. API REST — surface attendue

Préfixe `/api/v1`. Réponses d'erreur au format RFC 9457 (`application/problem+json`).

**Public**
- `GET /themes`, `GET /themes/:slug`
- `GET /quizzes?theme=&difficulty=&page=`, `GET /quizzes/:slug`
- `POST /quizzes/:slug/attempts` → crée un `Attempt` (anonyme ou authentifié), renvoie la première question
- `GET /attempts/:id/questions/current`
- `POST /attempts/:id/answers` → `{ questionId, answer }` → renvoie `{ isCorrect, correctAnswer, explanation, pointsEarned, nextQuestionId | null }`
- `POST /attempts/:id/finish` → récapitulatif
- `GET /leaderboard?scope=global|theme|30d&themeSlug=&page=`

**Auth**
- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`
- `POST /auth/verify-email`, `POST /auth/forgot-password`, `POST /auth/reset-password`

**Utilisateur connecté**
- `GET /me`, `PATCH /me`, `DELETE /me` (suppression RGPD), `GET /me/export` (export JSON de ses données)
- `GET /me/attempts?page=`, `GET /me/stats`, `GET /me/rank`

**Admin (`ADMIN` requis)**
- CRUD complet `/admin/themes`, `/admin/quizzes`, `/admin/questions`, `/admin/questions/:id/choices`, `/admin/questions/:id/accepted-answers`
- `POST /admin/quizzes/:id/publish` / `unpublish`
- `GET /admin/answer-reviews?status=pending`, `POST /admin/answer-reviews/:id/accept|reject`
- `POST /admin/quizzes/import` et `GET /admin/quizzes/:id/export` (format JSON documenté, pour saisir un lot de questions hors interface)
- `GET /admin/stats` (nombre de parties, taux de réussite par question — utile pour repérer les questions mal formulées)

## 8. Front Vue — structure attendue

Routes : `/`, `/themes/:slug`, `/quiz/:slug`, `/quiz/:slug/play`, `/quiz/:slug/result/:attemptId`, `/classement`, `/connexion`, `/inscription`, `/profil`, `/profil/historique`, `/admin/*` (chargée en lazy chunk séparé, guard `requiresAdmin`).

Organisation : découpage par **feature** (`src/features/quiz/`, `src/features/auth/`, `src/features/admin/`), chacune avec ses `components/`, `composables/`, `api/`, `types.ts`. Pas de dossier fourre-tout `components/` global au-delà des primitives UI.

Points d'attention :

- Un `composable` `useQuizSession()` encapsule le déroulé d'une partie (question courante, soumission, transition, état de fin) ; les composants restent déclaratifs.
- Pinia pour l'état d'authentification et les préférences ; Pinia Colada pour tout ce qui vient de l'API. Ne pas dupliquer les données serveur dans un store Pinia.
- Gestion explicite des trois états de chargement (`pending` / `error` / `success`) — pas d'écran blanc.
- Reprise de partie : si l'utilisateur recharge la page en cours de quiz, l'`Attempt` est repris là où il s'est arrêté (l'état de vérité est côté serveur).
- Responsive mobile-first : la cible principale est le téléphone (partage de quiz sur les réseaux sociaux de l'association).
- Accessibilité : navigation clavier complète, `aria-live="polite"` pour le retour de correction, contrastes WCAG AA, focus visible, pas de couleur comme seul porteur d'information (bon/mauvais = couleur **et** icône **et** texte).
- Textes de l'interface externalisés dès le départ (`vue-i18n`, locale `fr` unique pour l'instant) pour permettre une version anglaise plus tard.
- SEO minimal : titres et méta-descriptions par quiz, données structurées `Quiz` schema.org sur la page de présentation. *(SPA sans SSR : si le référencement devient un objectif, prévoir une phase de prérendu.)*

## 9. Back-office d'administration

- Liste de questions filtrable (thème, quiz, type, statut, taux de réussite) avec recherche plein texte sur l'énoncé.
- Éditeur de question adapté au type choisi : choix multiples avec réordonnancement, ou éditeur de réponses acceptées avec aperçu de la normalisation appliquée (l'admin doit voir ce que le moteur comparera réellement).
- Champs `explanation` et `source` obligatoires à la publication ; blocage de la publication d'un quiz contenant une question sans source.
- Prévisualisation « comme un joueur » avant publication.
- Import/export JSON d'un quiz complet.
- Journal des modifications (qui a modifié quoi, quand) sur les questions publiées.

## 10. Contenu historique — règle stricte

Le contenu de départ porte sur la période napoléonienne. **Tu ne rédiges aucune question à partir de ta seule mémoire.**

- Chaque question du seed doit comporter un champ `source` renseigné (ouvrage, auteur, page ou référence en ligne vérifiable) et un champ `explanation` qui contextualise la réponse.
- Le seed est créé avec `status = DRAFT` : rien n'est publié avant relecture humaine.
- Limite-toi à une vingtaine de questions de démonstration, en te cantonnant à des faits massivement établis (dates de batailles majeures, titres, institutions), et signale explicitement dans un fichier `SEED_NOTES.md` toute question dont tu n'es pas certain à 100 %, plutôt que de la présenter comme validée.
- Si tu ne peux pas sourcer une question, ne l'écris pas : produis à la place un gabarit vide à compléter.

## 11. Conformité et données personnelles

- Bannière cookies uniquement si des mesures d'audience non exemptées sont ajoutées ; les cookies de session et de partie anonyme sont techniquement nécessaires et n'exigent pas de consentement.
- Pages statiques : mentions légales, politique de confidentialité, contact.
- Droit à l'effacement : `DELETE /me` anonymise les `Attempt` (dissocie l'utilisateur, conserve les statistiques agrégées) et supprime les données personnelles.
- Droit à la portabilité : export JSON complet.
- Aucune donnée personnelle dans les logs (pas d'email, pas de mot de passe, pas de token).
- Pas de service tiers de tracking par défaut.

## 12. Qualité, tests, exploitation

- Tests unitaires obligatoires sur : le moteur de normalisation/comparaison des réponses libres (cas limites : accents, apostrophes, casse, fautes de frappe, chaînes vides), le calcul de score, la logique de classement, les guards d'autorisation.
- Tests d'intégration API sur : parcours anonyme complet, parcours inscrit complet, rattachement des parties anonymes à l'inscription, refus de resoumission d'une réponse, absence de fuite de `isCorrect` dans les payloads publics.
- E2E Playwright : un scénario « je joue un quiz sans compte », un scénario « je m'inscris et je vois mon rang », un scénario « admin crée et publie une question ».
- `README.md` : installation, variables d'environnement, commandes, schéma du modèle de données, décisions d'architecture.
- Scripts : `pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm db:migrate`, `pnpm db:seed`.
- GitHub Actions : lint + tests + build sur chaque PR.
