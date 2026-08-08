# 001 — Rendu cartographique : SVG + d3-geo, pas de tuiles

## Contexte

Le lot 3 introduit deux types de question cartographique :

- **`MAP_CLICK`** — cliquer la bonne entité sur une carte (pays, ville…) ; la réponse est un identifiant de feature, validée serveur par test d'appartenance.
- **`MAP_PLACE`** — placer un point ; la réponse est une paire lat/lng, notée serveur selon la distance orthodromique au point cible.

Deux jeux de données sont prévus : le monde (Natural Earth — pays, capitales, villes, fleuves, lacs) et la France (IGN ADMIN EXPRESS — régions, départements, communes). Aucune des deux mécaniques de jeu n'exige de navigation libre (zoom/pan continu) : le joueur voit une carte déjà cadrée et clique ou place un point dessus.

Trois invariants du projet pèsent directement sur ce choix :

- **Anti-triche** — `targetLat`/`targetLng` (`MAP_PLACE`) et les `featureIds` attendus (`MAP_CLICK`) ne sortent jamais vers le client avant soumission ; la correction est exclusivement serveur (`data-and-api.md` §2).
- **Accessibilité** — toute question cartographique a une alternative non spatiale au clavier, avec le même score (`CLAUDE.md` §4). Le rendu retenu doit donc permettre d'associer facilement chaque feature à un contrôle focusable/actionnable au clavier (liste, recherche textuelle), indépendamment du rendu graphique.
- **Sobriété** — aucun tracker tiers, fontes et ressources auto-hébergées ; un fournisseur de tuiles externe introduirait une dépendance, des quotas éventuels et une attribution supplémentaire à l'écran.

`CLAUDE.md` §3 fixe déjà une orientation par défaut (SVG + d3-geo, pas de tuiles, MapLibre seulement si navigation libre nécessaire, géométrie serveur via `@turf/turf`). Cet ADR formalise cette décision pour les deux mécaniques de jeu ci-dessus et précise le pipeline de données.

## Décision

**Rendu client** : SVG généré via `d3-geo` (projection + générateur de tracé) et `topojson-client` (décodage des TopoJSON en GeoJSON côté client, au moment du rendu). Pas de MapLibre GL JS, pas de tuiles raster ou vectorielles.

Chaque feature devient un `<path>` SVG avec un `id` stable (l'identifiant de la feature dans le dataset) — le DOM porte directement la structure interrogeable par `useMapQuestion()`, ce qui rend l'alternative clavier obligatoire (étape 5) triviale à construire : une liste de features focusables générée à partir des mêmes données, sans dupliquer la logique de sélection entre les deux modes d'interaction.

**Stockage et service des géométries** : fichiers TopoJSON statiques versionnés, `apps/web/public/geo/<slug>/<version>.topojson` (`data-and-api.md` §2) — jamais en base. Cache longue durée côté HTTP, l'URL versionnée sert de clé d'invalidation.

**Géométrie serveur** : test d'appartenance (`MAP_CLICK`) et distance orthodromique (`MAP_PLACE`) calculés via `@turf/turf` côté API, à partir des mêmes fichiers TopoJSON chargés en mémoire au démarrage du service — jamais côté client avant soumission.

**Pipeline de préparation des données** (`pnpm geo:import`, étape 2) :

1. Téléchargement depuis la source ouverte identifiée (Natural Earth pour le premier dataset).
2. Simplification géométrique et conversion TopoJSON via **`mapshaper`** (un seul outil pour les deux opérations, CLI et API Node, licence MIT, largement utilisé pour ce type de pipeline Natural Earth → TopoJSON).
3. Écriture du fichier `apps/web/public/geo/<slug>/<version>.topojson`.
4. Écriture d'un fichier de métadonnées à côté (`meta.json` : `sourceName`, `sourceUrl`, `license`, `attributionText`, `version`, poids obtenu) — la table `GeoDataset` n'existe pas encore à l'étape 2 (elle arrive à l'étape 3) ; ce fichier sert de source de vérité reprise lors de la migration/seed pour peupler `GeoDataset` en base.
5. Le script rapporte le poids du fichier produit.

**Dataset et résolution de démarrage** : pays du monde, Natural Earth **1:110m** — la résolution la plus grossière disponible, cohérente avec `content-and-data-sources.md` §2 (« retenir la résolution la plus grossière compatible avec la lisibilité du jeu ») et avec un rendu mobile en SVG où le détail fin des côtes n'est pas perceptible à l'échelle d'un écran de téléphone.

**Poids attendu** : un GeoJSON Natural Earth 1:110m des pays du monde pèse de l'ordre de 100-120 Ko brut ; la conversion TopoJSON (topologie partagée) et la simplification via `mapshaper` devraient ramener le fichier servi à quelques dizaines de Ko, avant compression HTTP (gzip/brotli, déjà en place pour les assets statiques du build Vite). Poids exact à confirmer et rapporter à l'étape 2 — cet ADR ne préjuge pas d'un chiffre précis avant l'avoir mesuré.

## Alternatives écartées

- **MapLibre GL JS avec tuiles vectorielles.** Navigation libre fluide à toute échelle, mais aucune de nos deux mécaniques n'en a besoin (carte déjà cadrée). La v6 impose WebGL2 (support incertain sur les appareils mobiles anciens, risque d'exclusion) et une distribution ESM qui complique l'intégration. Un fournisseur de tuiles ajoute une dépendance externe, des quotas/coûts éventuels et une attribution supplémentaire à afficher — à l'opposé de l'auto-hébergement déjà retenu pour les fontes. Écarté ; à reconsidérer seulement si un futur lot exige une véritable exploration cartographique (hors périmètre v1).
- **Rendu canvas/WebGL maison.** Évite la dépendance à un fournisseur de tuiles, mais réimplémente ce que `d3-geo` fait déjà (projection, générateur de tracé) sans bénéfice net, et perd l'avantage du SVG d'être directement interrogeable par le DOM pour l'alternative clavier. Écarté.
- **Géométries en base avec PostGIS, servies par requêtes spatiales.** Utile pour des requêtes complexes (ex. « communes dans un rayon de X km »), mais aucun besoin identifié : `MAP_CLICK`/`MAP_PLACE` se résument à un test d'appartenance ponctuel et un calcul de distance, faisables en mémoire via `@turf/turf` sans PostGIS. `data-and-api.md` §2 est explicite : géométries en fichiers statiques « sauf besoin avéré de requête spatiale, justifié par ADR » — pas de besoin avéré ici. Écarté ; à reconsidérer si un besoin de requête spatiale apparaît.
- **GeoJSON plutôt que TopoJSON.** Plus simple à produire et déboguer, mais duplique les frontières partagées entre polygones adjacents (chaque pays porte sa propre copie de la frontière commune), gonflant le poids. TopoJSON partage la topologie pour un coût de complexité minime grâce à `topojson-client`. Écarté au profit de TopoJSON.
- **Résolution Natural Earth 1:50m ou 1:10m dès le dataset de démarrage.** Plus détaillée, mais poids nettement supérieur pour un gain de lisibilité non perceptible sur un rendu mobile en SVG. Le spec demande explicitement la résolution la plus grossière compatible avec la lisibilité. Écarté pour le dataset de démarrage ; une résolution plus fine reste possible dataset par dataset si un contenu futur le justifie (ex. carte régionale zoomée).
- **Outils `topojson-server`/`topojson-simplify` séparés plutôt que `mapshaper`.** Fonctionnellement équivalents, mais deux outils à orchestrer au lieu d'un ; `mapshaper` couvre simplification et conversion TopoJSON en une seule commande. Écarté au profit de `mapshaper`, sans opposition de principe si un besoin précis justifiait l'un des deux outils spécialisés plus tard.
