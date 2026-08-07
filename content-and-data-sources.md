# Spec — Contenu historique et données géographiques

## 1. Contenu historique (règle stricte)

Le corpus de départ porte sur la période napoléonienne. **Aucune question n'est rédigée de mémoire.**

- Chaque question du seed comporte un champ `source` renseigné — ouvrage, auteur, page, ou référence en ligne vérifiable — et un champ `explanation` qui contextualise la réponse.
- Le seed est créé avec `status = DRAFT` : rien n'est publié avant relecture humaine.
- Une vingtaine de questions de démonstration au maximum, cantonnées à des faits massivement établis (dates de batailles majeures, titres, institutions). Toute question dont tu n'es pas certain à 100 % est signalée dans `SEED_NOTES.md` plutôt que présentée comme validée.
- Si tu ne peux pas sourcer une question, tu ne l'écris pas : tu produis un gabarit vide à compléter.

## 2. Données géographiques (règle stricte)

Aucune donnée géographique n'est inventée ni recopiée de mémoire. Chaque dataset est importé depuis une source ouverte identifiée, avec sa licence et son attribution renseignées dans `GeoDataset` et documentées dans `docs/DATA_SOURCES.md`.

**Sources par défaut**

- **Monde** (pays, capitales, villes, fleuves, lacs) : **Natural Earth**, jeu de données du domaine public disponible aux échelles 1:10m, 1:50m et 1:110m — https://www.naturalearthdata.com/. Convertir en TopoJSON et retenir la résolution la plus grossière compatible avec la lisibilité du jeu.
- **France** (régions, départements, communes) : **ADMIN EXPRESS de l'IGN**, sous Licence Ouverte Etalab — réutilisation libre **sous réserve de mentionner le producteur et la date de dernière mise à jour** — https://geoservices.ign.fr/adminexpress. Cette mention apparaît dans l'interface, pas seulement dans le dépôt.
- Toute autre source doit être validée avant intégration. En cas de doute sur la licence, on n'intègre pas.

**Règles complémentaires**

- Les frontières de certains territoires sont contestées : ne pas produire de question dont la réponse dépend d'un tracé disputé.
- Les toponymes affichés utilisent l'exonyme français lorsqu'il existe.
- Si des fonds de carte à tuiles sont utilisés (MapLibre), l'attribution du fournisseur et celle d'OpenStreetMap doivent être affichées, et les quotas ou coûts documentés dans l'ADR correspondant. Une carte de jeu en SVG sans tuiles reste la solution par défaut.
- Le script d'import et de simplification est versionné, reproductible, et rapporte le poids obtenu pour chaque fichier.
