# Sources des données géographiques

Documente chaque `GeoDataset` importé via `pnpm geo:import` (`apps/api/scripts/geo-import.ts`), conformément à `docs/spec/content-and-data-sources.md` §2. Les mêmes informations sont écrites en machine dans `apps/web/public/geo/<slug>/<version>.meta.json`.

## world-countries (v1)

| Champ                | Valeur                                                                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source               | Natural Earth — Admin 0 Countries, 1:110m                                                                                                                                                             |
| URL                  | https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/                                                                                                              |
| Licence              | Domaine public — aucune attribution requise                                                                                                                                                           |
| Attribution affichée | « Cartographie : Natural Earth (domaine public), naturalearthdata.com. »                                                                                                                              |
| Résolution           | 1:110m (la plus grossière disponible, cf. ADR 001)                                                                                                                                                    |
| Champs conservés     | `id` (`ADM0_A3`, code administratif à 3 lettres — `ISO_A3` vaut « -99 » pour plusieurs pays réels dont la France et la Norvège, inutilisable comme identifiant), `name` (`NAME_FR`, exonyme français) |
| Pipeline             | Téléchargement du GeoJSON → `mapshaper` (`-simplify 10% weighted keep-shapes`, `-o format=topojson`) → validation (aucune géométrie vide, `id`/`name` présents et uniques) → écriture                 |
| Poids obtenu         | 39,1 Ko (TopoJSON, 177 features), ~13,8 Ko compressé gzip                                                                                                                                             |
| Récupéré le          | 2026-08-07                                                                                                                                                                                            |

**Note.** Le fichier est téléchargé depuis `nvkelso/natural-earth-vector` sur GitHub, un miroir GeoJSON du jeu de données officiel Natural Earth maintenu par un membre de l'équipe Natural Earth — évite d'avoir à dézipper un shapefile pour ce pipeline. La donnée reste Natural Earth, la source de référence citée ci-dessus.
