# Prompts de lot — à copier dans Claude Code, un par session

Règle commune : `/clear` avant chaque lot, une branche git par lot, un commit à chaque étape validée.
Ne colle jamais deux lots dans la même session.

Ordre retenu : **1 → 2 → 3 → 4**. L'admin passe après la carto, pour ne pas refaire deux fois l'éditeur de question. Le mode championnat est parqué.

---

## Lot 1 — Système de design et identité

_Branche `feat/design-system`. Aucune fonctionnalité modifiée. Modèle : Opus pour la phase de propositions, Sonnet pour l'implémentation._

> Lis `docs/spec/frontend.md`, sections 1 et 2 uniquement. Ne lis aucun autre fichier de spec et n'explore pas le code existant pour l'instant.
>
> Étape 1, sans écrire de code : propose-moi trois directions artistiques distinctes. Pour chacune : palette de 5 à 6 couleurs nommées avec leurs hex, couple typographique (fonte d'affichage + fonte de texte + fonte de données, licences vérifiables), concept de mise en page en wireframe ASCII pour la page d'accueil et pour l'écran de partie, et l'élément signature. Ajoute pour chacune une phrase sur ce qu'elle raconte du sujet et une phrase sur ce qu'elle sacrifie. Vérifie tes propositions contre la liste des directions interdites ; si l'une s'en approche, remplace-la et dis-le.
>
> Attends mon choix avant l'étape 2.

Puis, après validation, dans la **même** session :

> Étape 2 : implémente la direction retenue. Livrables : `src/styles/tokens.css`, la configuration Tailwind associée, et une page `/styleguide` en dev uniquement qui montre toutes les primitives (bouton, champ, carte, badge, chrono, barre de progression, message d'erreur, état vide, squelette de chargement) dans leurs états. Ne touche à aucun composant existant.
>
> Étape 3 : le logo en SVG et ses déclinaisons, selon `docs/spec/frontend.md` section 2, plus `docs/BRAND.md`.
>
> Étape 4 : capture `/styleguide` en 1440 px et en 390 px avec Playwright, regarde les captures, liste ce qui ne va pas, corrige, puis présente-moi le résultat.

---

## Lot 2 — Refonte de l'interface de jeu

_Branche `feat/ui-refonte`. Contrats d'API inchangés. Une session par groupe d'écrans, pas une session pour les sept._

> Lis `docs/spec/frontend.md` en entier. N'ouvre pas les fichiers du back.
>
> On refond l'interface écran par écran sur les tokens du lot 1. On commence par : accueil, page de thème, page de présentation d'un quiz.
>
> Pour chacun, avant de coder : wireframe ASCII et hiérarchie d'information proposés, et tu attends ma validation. Ensuite tu implémentes, en traitant explicitement les états de chargement, vide et erreur.
>
> Quand les trois écrans sont faits : captures Playwright 1440 px et 390 px, auto-critique, corrections, puis tu t'arrêtes.

Sessions suivantes, après `/clear` :

> Même consigne, écrans suivants : `/quiz/:slug/play` puis `/quiz/:slug/result/:attemptId`. L'écran de résultat est le plus soigné du parcours. La partie doit rester jouable à une main sur mobile. Les fichiers concernés sont dans `src/features/quiz/`.

Puis :

> Même consigne, écrans restants : classement, connexion, inscription, profil, historique.

---

## Lot 3 — Module cartographique

_Branche `feat/geo`. Six étapes, une validation entre chacune, deux à trois sessions._

Session A :

> Lis `docs/spec/data-and-api.md` sections 2 et 4, et `docs/spec/content-and-data-sources.md` section 2.
>
> Étape 1 : rédige `docs/adr/001-rendu-cartographique.md` — choix entre SVG/d3-geo et MapLibre pour nos deux types de questions, pipeline de préparation des données, et poids de fichiers attendus. Pas de code. Attends ma validation.
>
> Étape 2 : le script `pnpm geo:import` — téléchargement, simplification, conversion TopoJSON, écriture des métadonnées de licence. Commence par **un seul dataset** : les pays du monde en 1:110m. Rapporte le poids obtenu.

Session B :

> Étape 3 : migration Prisma pour `GeoDataset`, les nouveaux types de question et la colonne `payload`, plus les schémas Zod discriminés dans `packages/shared`. Voir `docs/spec/data-and-api.md`.
>
> Étape 4 : les endpoints et la validation serveur, avec les tests de non-fuite décrits dans `docs/spec/quality.md`. Rien côté front pour l'instant.

Session C :

> Étape 5 : le composant de jeu cartographique et son composable `useMapQuestion()`, avec l'alternative clavier obligatoire décrite dans `docs/spec/game-rules.md` section 5. Fichiers dans `src/features/geo/`.
>
> Étape 6 : un quiz de démonstration « Capitales d'Europe » en `status = DRAFT`, sources renseignées.

---

## Lot 4 — Refonte du back-office

_Branche `feat/admin`. Contrats d'API constants ; ajoute des endpoints si nécessaire, n'en casse aucun._

Session A :

> Lis `docs/spec/admin.md` et `docs/spec/data-and-api.md` section 4.
>
> Avant tout code : maquettes en wireframe ASCII de deux écrans seulement — l'éditeur de question (avec son volet d'aperçu et l'éditeur cartographique) et la file de modération des réponses libres. Compte le nombre d'actions clavier/souris nécessaires pour créer une question à choix multiples complète, dans la version actuelle et dans ta proposition. Attends ma validation.

Session B, puis C :

> Implémente l'éditeur de question selon la maquette validée. [session suivante : la file de modération, puis la liste filtrable et la palette de commandes.]

---

## Parqué

Mode championnat : voir `docs/backlog/championnat.md`. Ne pas lancer.
