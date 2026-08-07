# Barèmes de score

Documente tous les calculs de score, classique et géographique, avec leurs cas limites — conformément à `docs/spec/game-rules.md` §3 et §5, et `docs/spec/quality.md` (« Documentation attendue »). Implémentation : `apps/api/src/attempts/scoring.ts` (classique) et `apps/api/src/attempts/geo-scoring.ts` (géographique).

## Classique (`SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TRUE_FALSE`, `FREE_TEXT`)

- Chaque question vaut `points` (défaut 1).
- `MULTIPLE_CHOICE` : tout-ou-rien — l'ensemble soumis doit être **exactement** l'ensemble des bonnes options (`isChoiceSelectionCorrect`). Pas de barème partiel dans cette version (point d'extension prévu dans le code, non implémenté).
- **Bonus de rapidité**, désactivé par défaut, activable par quiz (`Quiz.speedBonusEnabled`) :
  - Ne s'applique jamais si le quiz n'a pas de `timeLimitSeconds`, même si le drapeau est activé.
  - Budget de temps par question = `timeLimitSeconds / questionCount` (le temps imparti est défini au niveau du quiz, pas par question).
  - Si la réponse est soumise en moins d'un tiers de ce budget : multiplicateur ×1,5, arrondi au point entier le plus proche (`Math.round`).
  - Une réponse incorrecte rapporte toujours 0 point, bonus ou non.

## Géographique (`MAP_CLICK`, `MAP_PLACE`)

### `MAP_CLICK`

Réponse soumise : un identifiant de feature (`featureId`). Correct si et seulement si présent dans `featureIds` (la ou les bonnes réponses attendues du payload). Pas de score dégressif : tout-ou-rien, comme `SINGLE_CHOICE`.

### `MAP_PLACE`

Réponse soumise : une paire `{ lat, lng }`. Score dégressif selon la distance orthodromique (grand cercle, calculée via `@turf/turf`, cf. ADR 001) entre le point soumis et la cible (`targetLat`/`targetLng`, jamais envoyés au client avant soumission).

**Pas de bonus de rapidité sur `MAP_PLACE`**, même si le quiz l'a activé : le score dérive uniquement de la distance, remplace entièrement le calcul standard (tout-ou-rien ± bonus). Combiner les deux barèmes n'est spécifié nulle part et aurait été inventé sans base ; à trancher explicitement si le besoin apparaît.

**Courbe `LINEAR`** (seule courbe existante pour l'instant — `scoringCurve` dans le payload, cf. lot 3 étape 3) :

```
ratio = max(0, 1 − distance / toleranceKm)
pointsEarned = isCorrect ? round(points × ratio) : 0
isCorrect = distance ≤ toleranceKm
```

Autrement dit : points pleins à distance nulle, décroissance linéaire jusqu'à 0 point à `toleranceKm`, 0 point au-delà.

**Cas limites traités et testés** (`geo-scoring.spec.ts`) :

| Cas | Comportement |
| --- | --- |
| Distance nulle | `isCorrect = true`, points pleins |
| Distance exactement égale à `toleranceKm` | `isCorrect = true` (borne incluse), mais `pointsEarned = 0` (`ratio = 0`) — délibéré : « dans la tolérance » et « gagner des points » sont deux questions distinctes à la limite exacte |
| Franchissement de l'antiméridien (ex. 179°E ↔ 179°O) | Distance correcte (~2°, pas ~358°) — géré nativement par le calcul du grand cercle, aucun traitement particulier requis |
| Latitudes polaires (±90°) | Calculable, résultat fini |
| Coordonnées hors bornes (lat ∉ [−90, 90], lng ∉ [−180, 180]) | `RangeError` — rejeté avant même le calcul de distance ; la validation Zod (`submitAnswerSchema`) rejette aussi ces valeurs en amont, côté HTTP |

`AttemptAnswer.rawAnswer` enregistre `{ lat, lng }` ou `{ featureId }` selon le type, et `datasetVersion` la version du dataset utilisée au moment de la réponse — pour que la correction reste reproductible après mise à jour d'un dataset (game-rules.md §5), même si le dataset change de version ensuite.
