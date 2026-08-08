import { computed, ref, shallowRef } from 'vue';
import { geoCentroid, geoNaturalEarth1, geoPath, type GeoPath, type GeoProjection } from 'd3-geo';
import { feature as topojsonFeature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry } from 'geojson';

type CountryProperties = { id: string; name: string };

export interface MapFeature {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Pour le rendu : `pathGenerator(feature.geoJson)` produit le `d` du `<path>`. */
  geoJson: Feature<Geometry>;
}

type Status = 'pending' | 'error' | 'success';

export const MAP_VIEWBOX = { width: 100, height: 60 } as const;

/**
 * Charge un dataset TopoJSON statique (apps/web/public/geo/, ADR 001),
 * construit une projection d3-geo ajustée au viewBox, et centralise l'état
 * de sélection partagé entre l'interaction souris (carte) et l'alternative
 * clavier obligatoire (game-rules.md §5) : les deux modes écrivent dans le
 * même état, donc le score est structurellement identique quel que soit le
 * mode utilisé pour répondre.
 */
export function useMapQuestion(options: { datasetSlug: () => string; datasetVersion: () => string }) {
  const status = ref<Status>('pending');
  const errorMessage = ref<string | null>(null);
  const features = ref<MapFeature[]>([]);
  const projection = shallowRef<GeoProjection | null>(null);
  const pathGenerator = shallowRef<GeoPath | null>(null);

  const selectedFeatureId = ref<string | null>(null);
  const freeformPoint = ref<{ lat: number; lng: number } | null>(null);

  async function load(): Promise<void> {
    status.value = 'pending';
    errorMessage.value = null;
    selectedFeatureId.value = null;
    freeformPoint.value = null;

    try {
      const url = `/geo/${options.datasetSlug()}/${options.datasetVersion()}.topojson`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Impossible de charger la carte (${response.status}).`);
      }
      const topology = (await response.json()) as Topology;
      const [objectName] = Object.keys(topology.objects);
      const topologyObject = objectName ? topology.objects[objectName] : undefined;
      if (!topologyObject) {
        throw new Error('Le fichier de carte ne contient aucune couche.');
      }

      const collection = topojsonFeature(topology, topologyObject) as unknown as FeatureCollection<
        Geometry,
        CountryProperties
      >;

      const proj = geoNaturalEarth1().fitSize(
        [MAP_VIEWBOX.width, MAP_VIEWBOX.height],
        collection,
      );
      projection.value = proj;
      pathGenerator.value = geoPath(proj);

      features.value = collection.features.map((f) => {
        const [lng, lat] = geoCentroid(f);
        return { id: f.properties.id, name: f.properties.name, lat, lng, geoJson: f };
      });

      status.value = 'success';
    } catch (error) {
      status.value = 'error';
      errorMessage.value = error instanceof Error ? error.message : 'Erreur inconnue.';
    }
  }

  function selectFeature(featureId: string): void {
    selectedFeatureId.value = featureId;
    const found = features.value.find((f) => f.id === featureId);
    freeformPoint.value = found ? { lat: found.lat, lng: found.lng } : null;
  }

  /** Clic libre sur la carte (MAP_PLACE) : coordonnées SVG déjà converties
   * en unités du viewBox par l'appelant (voir MapQuestion.vue). */
  function selectPoint(svgX: number, svgY: number): void {
    if (!projection.value) return;
    const inverted = projection.value.invert?.([svgX, svgY]);
    if (!inverted) return;
    const [lng, lat] = inverted;
    selectedFeatureId.value = null;
    freeformPoint.value = { lat, lng };
  }

  const hasAnswer = computed(
    () => selectedFeatureId.value !== null || freeformPoint.value !== null,
  );

  return {
    status,
    errorMessage,
    features,
    projection,
    pathGenerator,
    selectedFeatureId,
    freeformPoint,
    hasAnswer,
    load,
    selectFeature,
    selectPoint,
  };
}
