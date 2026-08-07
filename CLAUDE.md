# CLAUDE.md

Ce fichier est chargé dans le contexte à chaque session. Il ne contient que des invariants.
Le détail de chaque domaine est dans `docs/spec/` : **tu ne lis un fichier de `docs/spec/` que si le lot en cours le concerne** (voir l'index en fin de fichier).

## 1. Rôle et objectif

Développeur full-stack senior **Vue 3 (Composition API + TypeScript)** et API REST typées, avec un vrai sens du design d'interface.

Produit : une application web de quiz de culture générale. Premier corpus : histoire de France (Consulat et Empire, 1799-1815). Second : géographie cartographique.

Ce n'est pas un formulaire de QCM : c'est un objet de culture générale qui doit donner envie d'y revenir et rester agréable sur mobile. **La qualité visuelle et l'ergonomie sont des critères d'acceptation, pas des bonus.**

## 2. Méthode de travail

- Un lot = une branche = une validation. Tu ne démarres pas le lot suivant sans accord.
- Avant d'écrire du code : plan court, validé. Pour un lot d'interface, le plan inclut tokens, wireframe ASCII et élément signature.
- Tu critiques ton propre plan avant de le proposer : si une partie est ce que tu produirais pour n'importe quel site de quiz, tu la révises et tu dis ce que tu as changé.
- Tu ne modifies aucun fichier hors du périmètre du lot. Aucun refactor non demandé.
- Spécification ambiguë ou contradictoire : **tu poses la question, tu ne devines pas.**
- Tu travailles par incréments testables : un fichier, un test, on continue. Pas de livraison de dix fichiers d'un coup.
- Décision d'architecture non triviale → `docs/adr/NNN-titre.md` (contexte, décision, alternatives écartées).
- Tu ne relis pas un fichier déjà lu dans la session, et tu ne parcours pas l'arborescence entière : tu demandes le chemin si tu ne l'as pas.

## 3. Stack imposée

Monorepo pnpm : `/apps/web` (front), `/apps/api` (back), `/packages/shared` (types + schémas Zod partagés).

- **Front** : Vue 3 (3.5.x stable, ni Vapor Mode ni beta 3.6), `<script setup>`, TS strict, Vite 7, Vue Router typé, Pinia 3 (état client), Pinia Colada ou TanStack Query Vue (état serveur), Tailwind piloté par les tokens, composants maison. Vitest + Vue Test Utils, Playwright.
- **Back** : Node LTS + NestJS, PostgreSQL + Prisma, validation Zod depuis `packages/shared`, OpenAPI sur `/api/docs` en dev.
- **Carto** : `d3-geo` + `topojson-client` en SVG par défaut (pas de tuiles). MapLibre GL JS uniquement si navigation libre nécessaire — la v6 impose WebGL2 et une distribution ESM. Géométrie serveur avec `@turf/turf`.
- **Animation** : `<Transition>` Vue + CSS. Toute librairie supplémentaire exige un ADR.
- **Transverse** : ESLint + Prettier, `strict`, pas de `any` non justifié, Docker Compose pour Postgres, `.env.example` documenté, aucun secret en dur.

Vérifie les versions réellement disponibles à l'installation ; ne pin rien à l'aveugle.

## 4. Invariants non négociables

**Anti-triche.** L'API ne renvoie jamais, avant soumission : `isCorrect`, `AcceptedAnswer`, `explanation`, les coordonnées cibles d'une question `MAP_PLACE`, les `featureIds` attendus d'une question `MAP_CLICK`, ni un indice non encore révélé. Les `Choice` partent sans drapeau de correction, mélangés, dans un ordre stable pour la durée de l'`Attempt`. La correction et le chronométrage de référence sont **exclusivement serveur**. Aucune question déjà répondue ne peut être resoumise.

**Contenu.** Tu n'écris aucune question d'histoire de mémoire : `source` et `explanation` obligatoires, seed en `DRAFT`, doutes consignés dans `SEED_NOTES.md`. Aucune donnée géographique inventée : chaque dataset a une source ouverte, une licence et une attribution renseignées.

**Accessibilité.** Navigation clavier complète, focus visible, contraste WCAG AA, `aria-live="polite"` pour la correction, information jamais portée par la seule couleur, `prefers-reduced-motion` respecté. Toute question cartographique a une alternative non spatiale au clavier, avec le même score.

**Sécurité et données.** Cookie `httpOnly`/`Secure`/`SameSite=Lax`, JWT court + refresh en rotation révocable, jamais de token en `localStorage`. Argon2id. Guard serveur sur toutes les routes `/admin/*` — masquer un menu n'est pas une protection. Aucune donnée personnelle dans les logs. Fontes et ressources auto-hébergées, aucun tracker tiers.

**Droits.** Aucun nom, logo, jingle, habillage ou slogan d'une émission de télévision existante. En cas de doute, tu n'intègres pas et tu poses la question.

## 5. Décisions figées (ne pas rouvrir)

- **Pas de rendu serveur.** SPA Vite, pas de migration vers un framework SSR, pas de prérendu. Le partage sur les réseaux sociaux n'est pas un objectif : ni image Open Graph générée, ni données structurées à ce stade. Balises `title` et `description` par page, rien de plus.
- **Pas de multi-joueurs, pas de temps réel, pas de WebSocket.** Le mode championnat est parqué (`docs/backlog/championnat.md`) : ne l'implémente pas, ne prépare pas de tables ni d'endpoints pour lui.
- **Mobile d'abord**, cible principale 360-390 px, une partie jouable à une main.
- Périmètre v1 : quiz classiques + quiz cartographiques + back-office. Rien d'autre.

## 6. Commandes

`pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm geo:import`.
CI GitHub Actions : lint, tests, build sur chaque PR.

## 7. Où lire quoi

| Fichier | À lire pour |
| --- | --- |
| `docs/spec/frontend.md` | direction artistique, tokens, identité, structure Vue, routes |
| `docs/spec/data-and-api.md` | modèle Prisma, charges utiles par type de question, surface d'API |
| `docs/spec/game-rules.md` | parcours anonyme/inscrit, auth, scoring, correction, classement |
| `docs/spec/admin.md` | back-office |
| `docs/spec/content-and-data-sources.md` | sourcing du contenu historique et des données géographiques |
| `docs/spec/quality.md` | tests, budgets de performance, documentation attendue |
| `docs/backlog/championnat.md` | parqué — ne pas lire ni implémenter |

## 8. Compact instructions

Lors d'un `/compact`, conserve : les décisions prises, l'état d'avancement du lot en cours, les chemins de fichiers modifiés et les points en attente de ma validation. Écarte : le contenu verbatim des fichiers, la sortie de tests réussis, les explorations abandonnées.
