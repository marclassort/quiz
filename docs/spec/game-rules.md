# Spec — Règles de jeu, parcours et authentification

## 1. Parcours anonyme vs. compte

1. **Anonyme** : au premier lancement d'un quiz, l'API crée un `Attempt` avec un `guestToken` (uuid v4) stocké dans un cookie `httpOnly` de 30 jours. Le visiteur voit son score de fin de partie et la correction, mais pas d'historique multi-quiz, pas de statistiques, pas de classement.
2. **Incitation** : à la fin d'une partie anonyme, un encart propose la création d'un compte pour conserver ses résultats et entrer au classement. Cet encart fait partie des écrans à soigner.
3. **Réclamation des résultats** : si l'utilisateur s'inscrit alors qu'un `guestToken` valide existe, ses `Attempt` anonymes sont rattachés au nouveau compte (transaction : renseigner `userId`, vider `guestToken`, recalculer `UserStats`). La bascule doit être idempotente.
4. **Inscrit** : historique complet, statistiques (précision par thème, progression dans le temps), classement, rejeu d'un quiz en mode entraînement.

## 2. Authentification et rôles

- Inscription par email et mot de passe (argon2id). `displayName` public distinct de l'email — l'email n'est **jamais** exposé dans une réponse d'API publique.
- Mot de passe : 12 caractères minimum, vérification contre les mots de passe compromis (score zxcvbn) plutôt que des règles de complexité arbitraires.
- Session par cookie `httpOnly`, `Secure`, `SameSite=Lax` contenant un JWT d'accès de 15 minutes + refresh token en rotation stocké en base et révocable. Jamais de token en `localStorage`.
- Vérification d'email par lien signé ; réinitialisation par token à usage unique expirant en une heure.
- Rate limiting sur `/auth/*` (par IP et par compte) et sur la soumission de réponses.
- Rôle `ADMIN` attribué manuellement en base ; guard NestJS sur `/admin/*` et vérification serveur systématique.

## 3. Scoring

- Chaque question vaut `points` (défaut 1, modulable par difficulté).
- `MULTIPLE_CHOICE` : bonne réponse = ensemble exact des bonnes options. Prévoir un point d'extension pour un barème partiel, mais **implémenter le tout-ou-rien par défaut**.
- Bonus de rapidité : désactivé par défaut, activable par quiz via un drapeau. Si activé, formule explicite documentée dans `docs/SCORING.md`.
- **Un seul essai comptabilisé par quiz et par utilisateur : le premier** (`countsForRanking = true`). Les suivants sont en mode entraînement et exclus du classement — sinon le classement récompense la répétition, pas la connaissance.
- `docs/SCORING.md` rassemble tous les barèmes, classique et géographique, avec les cas limites traités.

## 4. Correction des réponses libres (`FREE_TEXT`)

Pipeline, dans cet ordre :

1. Normalisation : trim, casse basse, suppression des diacritiques (NFD + suppression des marques), suppression de la ponctuation, réduction des espaces multiples, retrait des articles initiaux (`le`, `la`, `les`, `l'`, `d'`, `de`).
2. Comparaison exacte avec chaque `AcceptedAnswer` normalisée.
3. Si échec : distance de Levenshtein, seuil dépendant de la longueur (≤ 1 pour 4-7 caractères, ≤ 2 pour 8-12, ≤ 3 au-delà ; aucune tolérance sous 4 caractères).
4. Si toujours échec : réponse comptée fausse, **mais** la chaîne soumise est enregistrée dans `AnswerReview` avec incrément d'`occurrences`. L'admin peut la promouvoir en `AcceptedAnswer` en une action.
5. **Jamais de LLM pour corriger à la volée** : coût, latence et non-déterminisme incompatibles avec un score.

Saisie : `autocomplete="off"`, 100 caractères maximum, affichage de la réponse attendue et de l'`explanation` après soumission.

## 5. Correction des réponses cartographiques

- `MAP_CLICK` : la réponse est l'identifiant de la feature cliquée ; validation par appartenance à `featureIds`. Le jeu de features envoyé au client ne porte aucun marquage.
- `MAP_PLACE` : score dégressif selon la distance orthodromique à la cible, formule explicite dans `docs/SCORING.md`, implémentée uniquement serveur et testée unitairement. Cas obligatoires : distance nulle, distance exactement égale à `toleranceKm`, franchissement de l'antiméridien, latitudes polaires, coordonnées hors bornes.
- Chaque `AttemptAnswer` enregistre la `datasetVersion` utilisée, pour que la correction reste reproductible après mise à jour d'un dataset.
- Chaque dataset affiche sa mention de source là où la carte est visible.
- **Alternative non spatiale obligatoire** : liste de propositions navigable au clavier, permettant de répondre sans souris et sans perception fine des positions, avec un score identique. Vérifiée par un test E2E.

## 6. Classement

- Global par `totalScore` décroissant, départage par `averageAccuracy` puis par date d'inscription.
- Vues : global (all-time), par thème, glissant 30 jours.
- Éligibilité : minimum 3 quiz terminés, pour éviter les classements pollués par un unique quiz réussi.
- Pagination + endpoint « ma position » renvoyant le rang et les 5 voisins, même hors première page.
- `displayName` uniquement. Un utilisateur peut se retirer du classement (`hiddenFromLeaderboard`) tout en conservant ses statistiques privées.
- `UserStats` mis à jour transactionnellement à la fin de chaque `Attempt` comptabilisé ; commande CLI de recalcul complet (`pnpm --filter api stats:rebuild`) pour réparer une dérive.

## 7. Conformité

- Bannière cookies uniquement si des mesures d'audience non exemptées sont ajoutées ; les cookies de session et de partie anonyme sont techniquement nécessaires.
- Pages statiques : mentions légales, politique de confidentialité, contact, sources de données et licences.
- Droit à l'effacement : `DELETE /me` anonymise les `Attempt` (dissocie l'utilisateur, conserve les agrégats) et supprime les données personnelles.
- Droit à la portabilité : export JSON complet.
- Aucune donnée personnelle dans les logs.
