import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { applyCommands } from 'mapshaper';

/**
 * ADR 001 : SVG + d3-geo côté rendu, TopoJSON statique versionné servi
 * depuis apps/web/public/geo/<slug>/<version>.topojson (data-and-api.md §2).
 * Un seul dataset pour l'instant (lot 3, étape 2) : les pays du monde.
 */
interface DatasetSpec {
  slug: string;
  version: string;
  downloadUrl: string;
  name: string;
  kind: 'COUNTRY' | 'CAPITAL' | 'CITY' | 'RIVER' | 'LAKE' | 'ADMIN_FR' | 'OTHER';
  scope: string;
  sourceName: string;
  sourceUrl: string;
  license: string;
  attributionText: string;
}

const DATASETS: DatasetSpec[] = [
  {
    slug: 'world-countries',
    version: 'v1',
    // Miroir GeoJSON du jeu de données officiel Natural Earth, maintenu par
    // un membre de l'équipe Natural Earth — évite d'avoir à dézipper un
    // shapefile pour ce pipeline.
    downloadUrl:
      'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',
    name: 'Pays du monde',
    kind: 'COUNTRY',
    scope: 'world',
    sourceName: 'Natural Earth — Admin 0 Countries (1:110m)',
    sourceUrl:
      'https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/',
    license: 'Public Domain',
    attributionText: 'Cartographie : Natural Earth (domaine public), naturalearthdata.com.',
  },
];

function runMapshaper(commands: string, input: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    applyCommands(commands, input, (error, output) => {
      if (error) {
        reject(error);
        return;
      }
      const result = Object.values(output)[0];
      if (!result) {
        reject(new Error('mapshaper n’a produit aucune sortie.'));
        return;
      }
      resolve(result);
    });
  });
}

/**
 * Vérifie ce qui nous a mordu manuellement pendant la mise au point du
 * pipeline : `-simplify` seul peut réduire une petite île à une géométrie
 * vide (`type: null`), et `ISO_A3` vaut "-99" pour plusieurs pays bien réels
 * (France, Norvège, Kosovo...) côté Natural Earth — id inutilisable tel
 * quel. On échoue fort plutôt que de servir un dataset silencieusement
 * incomplet.
 */
function validateTopology(topojson: string): void {
  const parsed: {
    objects: Record<
      string,
      { geometries: { type: string | null; properties?: Record<string, unknown> }[] }
    >;
  } = JSON.parse(topojson);
  const [layer] = Object.values(parsed.objects);
  if (!layer) {
    throw new Error('Aucune couche TopoJSON trouvée.');
  }

  const emptyGeometries = layer.geometries.filter((g) => g.type === null);
  if (emptyGeometries.length > 0) {
    throw new Error(
      `${emptyGeometries.length} géométrie(s) vide(s) après simplification : ${JSON.stringify(
        emptyGeometries.map((g) => g.properties),
      )}`,
    );
  }

  const ids = layer.geometries.map((g) => g.properties?.id);
  const missing = layer.geometries.filter((g) => !g.properties?.id || !g.properties?.name);
  if (missing.length > 0) {
    throw new Error(`${missing.length} feature(s) sans id ou name.`);
  }
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) {
    throw new Error(`id(s) en double : ${[...new Set(duplicates)].join(', ')}`);
  }
}

async function importDataset(dataset: DatasetSpec): Promise<void> {
  console.log(`[${dataset.slug}] Téléchargement : ${dataset.downloadUrl}`);
  const response = await fetch(dataset.downloadUrl);
  if (!response.ok) {
    throw new Error(`Échec du téléchargement (${response.status} ${response.statusText}).`);
  }
  const geojson = await response.text();

  console.log(`[${dataset.slug}] Simplification et conversion TopoJSON...`);
  // -filter-fields + -rename-fields : les colonnes Natural Earth d'origine
  // (population, PIB, classement de rendu...) sont hors sujet pour un quiz et
  // gonflent le fichier. `ADM0_A3` sert d'id stable : `ISO_A3` vaut "-99" pour
  // plusieurs pays (voir validateTopology). `keep-shapes` empêche les petits
  // territoires de disparaître pendant la simplification.
  const commands = [
    '-i input.geojson',
    '-filter-fields fields=NAME_FR,ADM0_A3',
    '-rename-fields name=NAME_FR,id=ADM0_A3',
    '-simplify 10% weighted keep-shapes',
    '-o format=topojson quantization=1e5 output.topojson',
  ].join(' ');
  const topojson = await runMapshaper(commands, { 'input.geojson': geojson });

  validateTopology(topojson);

  const outDir = path.resolve(__dirname, '../../web/public/geo', dataset.slug);
  await mkdir(outDir, { recursive: true });

  const topojsonPath = path.join(outDir, `${dataset.version}.topojson`);
  await writeFile(topojsonPath, topojson, 'utf-8');

  const meta = {
    slug: dataset.slug,
    name: dataset.name,
    kind: dataset.kind,
    scope: dataset.scope,
    sourceName: dataset.sourceName,
    sourceUrl: dataset.sourceUrl,
    license: dataset.license,
    attributionText: dataset.attributionText,
    version: dataset.version,
  };
  const metaPath = path.join(outDir, `${dataset.version}.meta.json`);
  await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf-8');

  const sizeKb = (Buffer.byteLength(topojson, 'utf-8') / 1024).toFixed(1);
  console.log(`[${dataset.slug}] Écrit ${topojsonPath} (${sizeKb} Ko)`);
  console.log(`[${dataset.slug}] Métadonnées : ${metaPath}`);
}

async function main() {
  for (const dataset of DATASETS) {
    await importDataset(dataset);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
