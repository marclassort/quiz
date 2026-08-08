# Portulan — identité de marque

## Nom et baseline

**Portulan** — _« Portulan, la culture générale prend le large. »_

Un portulan est une carte marine ancienne à lignes de rumb, utilisée pour la navigation avant l'usage de la projection de Mercator. Le nom ancre le produit dans son sujet (cartographie ancienne, XIXᵉ siècle) sans se limiter à un seul corpus — il couvre aussi bien l'histoire de France que la géographie cartographique.

## Logotype

Le monogramme est un « P » construit sur une grille géométrique (unités de 1 sur un carré 32×32) : une hampe et un fût plein, avec un losange en réserve dans le fût. Ce losange reprend exactement la forme du marqueur de position courante du composant `RouteProgress` (l'élément signature de l'interface, `apps/web/src/features/quiz/components/RouteProgress.vue`) — la marque et le produit partagent le même vocabulaire de forme.

Aucun dégradé, aucune ombre portée. Toutes les déclinaisons restent lisibles à 24 px.

### Fichiers

| Fichier                       | Usage                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `public/brand/logo-mark.svg`  | Monogramme carré seul — favicon, avatar, espaces exigus                                          |
| `public/brand/logo.svg`       | Version horizontale (monogramme + nom), couleur — usage par défaut                               |
| `public/brand/logo-mono.svg`  | Version horizontale, une seule couleur (`currentColor`) — impression, contextes à couleur unique |
| `public/favicon.svg`          | = `logo-mark.svg`, favicon SVG moderne                                                           |
| `public/favicon-32x32.png`    | Favicon PNG, fallback navigateurs sans support SVG                                               |
| `public/apple-touch-icon.png` | Icône iOS/Android (180×180)                                                                      |

## Couleurs autorisées

- **Version couleur** (`logo.svg`) : monogramme en accent primaire `--color-accent-primary` (#274b7c), nom en encre `--color-ink` (#1b2430) — sur fond clair (`--color-bg` ou `--color-surface`) uniquement.
- **Version monochrome encre** (`logo-mono.svg`, `color: var(--color-ink)`) : sur fond clair.
- **Version monochrome blanche** (`logo-mono.svg`, `color: white`) : sur fond `--color-accent-primary` ou `--color-ink` uniquement — jamais sur une photo ou un fond texturé.

Interdit : recolorer le monogramme dans l'accent secondaire, les couleurs sémantiques (succès/erreur) ou toute couleur hors de ce système ; appliquer un dégradé ou une ombre ; étirer ou déformer le logo (le ratio largeur/hauteur est fixe).

## Zone de protection

Une marge minimale égale à la largeur de la hampe du monogramme (1 unité de la grille, soit 5/32 de la hauteur du logo) doit rester libre de tout autre élément (texte, bord de cadre, autre logo) tout autour de chaque déclinaison.

## Taille minimale

- Monogramme seul : 24 px.
- Version horizontale : 120 px de large (en dessous, utiliser le monogramme seul plutôt que réduire le nom jusqu'à l'illisibilité).

## Ce qui n'a pas encore de logo

Aucun élément visuel (nom, logo, habillage) d'une émission de télévision existante n'est utilisé, à quelque titre que ce soit (claude.md §4).
