# Spec — Qualité, tests et performance

## Tests unitaires obligatoires

Moteur de normalisation et de comparaison des réponses libres (accents, apostrophes, casse, fautes de frappe, chaînes vides) ; calcul de score classique et géographique ; logique de classement ; guards d'autorisation.

## Tests d'intégration API

Parcours anonyme complet ; parcours inscrit complet ; rattachement des parties anonymes à l'inscription ; refus de resoumission d'une réponse ; et un test dédié vérifiant qu'aucune réponse d'API publique ne contient `isCorrect`, `targetLat`, `targetLng`, un `featureIds` attendu ou une `AcceptedAnswer`.

## E2E Playwright

« je joue un quiz sans compte » ; « je m'inscris et je vois mon rang » ; « je réponds à une question cartographique au clavier uniquement » ; « un admin crée et publie une question ».

## Performance et qualité visuelle (mesurées, pas déclarées)

- Budget de poids JS de la route de jeu défini dans `docs/PERF_BUDGET.md`, vérifié en CI, échec de build en cas de dépassement.
- Poids des fichiers TopoJSON mesuré et documenté après simplification et compression.
- Tests d'accessibilité automatisés (axe) sur les écrans de jeu, en complément des tests clavier manuels.
- Tests de non-régression visuelle Playwright sur les composants clés : carte de question, écran de résultat, tableau de bord admin.

## Documentation attendue

`README.md` (installation, variables d'environnement, commandes, schéma du modèle de données, décisions d'architecture), `docs/BRAND.md`, `docs/SCORING.md`, `docs/DATA_SOURCES.md`, `docs/PERF_BUDGET.md`, `docs/adr/`.
