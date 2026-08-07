# Spec — Direction artistique, identité et front Vue

## 1. Direction artistique

**Ancrage.** L'univers visuel vient du sujet : cartographie ancienne, gravure, typographie d'imprimerie du XIXᵉ siècle, symboles héraldiques et militaires — réinterprétés dans un langage d'interface contemporain. Pas de pastiche « vieux parchemin », pas de texture papier jauni.

**Système de tokens.** Tous les styles dérivent de variables CSS d'un seul fichier `src/styles/tokens.css`, exposées à Tailwind. Aucune valeur hexadécimale ni taille de police en dur dans un composant. Le système comprend :

- 5 à 6 couleurs nommées — fond, surface, encre, accent primaire, accent secondaire, sémantiques succès et erreur — avec leurs variantes de contraste ;
- une échelle typographique explicite : une fonte d'affichage employée avec parcimonie, une fonte de texte, une fonte utilitaire pour chiffres et données. Chiffres tabulaires obligatoires pour scores, distances et chronomètres ;
- une échelle d'espacement, un jeu de rayons, deux niveaux d'élévation maximum ;
- des durées et courbes d'animation nommées.

Vérifier la licence de chaque fonte avant intégration (préférer SIL OFL) et l'héberger localement.

**Directions interdites** — ce sont les défauts génériques de la génération assistée :

- fond crème (≈ #F4F1EA) + serif à fort contraste + accent terre cuite (≈ #D97757) ;
- fond quasi noir + unique accent vert acide ou vermillon ;
- pastiche « journal » à filets d'un pixel, angles vifs et colonnes denses ;
- dégradés violet/indigo génériques, cartes flottantes identiques partout, emojis en guise d'icônes.

**Élément signature.** Un seul élément mémorable, décidé au lot 1 et réutilisé comme fil conducteur — traitement cartographique du fond, progression en frise chronologique, transition de question caractéristique. La hardiesse est dépensée à un seul endroit ; le reste est calme et discipliné.

**États.** Chargement, vide et erreur sont conçus : squelettes reprenant la forme du contenu attendu, écrans vides qui proposent une action, messages d'erreur qui disent ce qui s'est passé et quoi faire. Jamais de spinner centré seul.

**Écriture d'interface.** Les libellés nomment ce que l'utilisateur contrôle, jamais la mécanique interne. Voix active, verbe exact : « Valider ma réponse », pas « Soumettre ». Un libellé garde le même mot tout au long du parcours : le bouton « Publier » produit le message « Publié ». Les erreurs ne s'excusent pas et ne sont jamais vagues.

## 2. Identité

- Nom du produit et baseline fixés avant le logo.
- Logo en **SVG optimisé**, grille géométrique, décliné en monogramme carré (favicon 32 et 180 px), version horizontale avec le nom, version monochrome. Lisible à 24 px. Pas de dégradé, pas d'ombre, aucun détail qui disparaît en petit.
- Fichiers : `public/brand/logo.svg`, `logo-mark.svg`, `logo-mono.svg`, favicons.
- `docs/BRAND.md` documente nom, baseline, usages, zones de protection, combinaisons de couleurs autorisées.

## 3. Structure du front

**Routes** : `/`, `/themes/:slug`, `/quiz/:slug`, `/quiz/:slug/play`, `/quiz/:slug/result/:attemptId`, `/classement`, `/connexion`, `/inscription`, `/profil`, `/profil/historique`, `/admin/*` (lazy chunk séparé, guard `requiresAdmin`), `/styleguide` (dev uniquement).

**Organisation par feature** : `src/features/quiz/`, `src/features/geo/`, `src/features/auth/`, `src/features/admin/`, chacune avec ses `components/`, `composables/`, `api/`, `types.ts`. Pas de dossier fourre-tout `components/` global au-delà des primitives issues des tokens.

**Points d'attention**

- `useQuizSession()` encapsule le déroulé d'une partie — question courante, soumission, transition, fin ; les composants restent déclaratifs.
- `useMapQuestion()` encapsule le rendu de carte, la sélection et l'alternative clavier, indépendamment du moteur de rendu.
- Pinia pour l'authentification et les préférences ; Pinia Colada pour tout ce qui vient de l'API. Ne jamais dupliquer des données serveur dans un store Pinia.
- Trois états `pending` / `error` / `success` traités explicitement sur chaque écran.
- Reprise de partie : au rechargement en cours de quiz, l'`Attempt` reprend là où il s'est arrêté — l'état de vérité est serveur.
- Mobile d'abord, dès 360 px, partie jouable à une main.
- L'écran de résultat est le plus soigné du parcours (sans image Open Graph : le partage social n'est pas un objectif v1).
- Textes externalisés dès le départ (`vue-i18n`, locale `fr` unique) pour permettre une version anglaise plus tard.
- SEO : `title` et `description` par page. Pas de données structurées, pas de prérendu.
- Le module `geo` est chargé en chunk séparé et n'entre jamais dans le bundle d'entrée.
