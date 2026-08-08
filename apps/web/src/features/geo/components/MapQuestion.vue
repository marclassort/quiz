<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { PublicMapClickPayload, PublicMapPlacePayload } from '@quiz/shared';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import { useGeoDatasetQuery } from '../api/datasets';
import { MAP_VIEWBOX, useMapQuestion } from '../composables/useMapQuestion';

const props = defineProps<{
  type: 'MAP_CLICK' | 'MAP_PLACE';
  payload: PublicMapClickPayload | PublicMapPlacePayload;
}>();

const answer = defineModel<{ featureId: string } | { lat: number; lng: number } | null>('answer', {
  default: null,
});

const {
  status,
  errorMessage,
  features,
  projection,
  pathGenerator,
  selectedFeatureId,
  freeformPoint,
  load,
  selectFeature,
  selectPoint,
} = useMapQuestion({
  datasetSlug: () => props.payload.datasetSlug,
  datasetVersion: () => props.payload.datasetVersion,
});

onMounted(load);

// Source de vérité unique : que la sélection vienne du clic sur la carte ou
// de la liste clavier, elle transite par selectedFeatureId/freeformPoint —
// ce watch est le seul endroit qui traduit cet état en réponse soumissible,
// garantissant que les deux modes produisent structurellement la même chose.
watch([selectedFeatureId, freeformPoint], () => {
  if (props.type === 'MAP_CLICK') {
    answer.value = selectedFeatureId.value ? { featureId: selectedFeatureId.value } : null;
  } else {
    answer.value = freeformPoint.value
      ? { lat: freeformPoint.value.lat, lng: freeformPoint.value.lng }
      : null;
  }
});

const { data: dataset } = useGeoDatasetQuery(() => props.payload.datasetSlug);

const promptText = computed(() =>
  props.type === 'MAP_CLICK' ? (props.payload as PublicMapClickPayload).prompt : null,
);
const toleranceKm = computed(() =>
  props.type === 'MAP_PLACE' ? (props.payload as PublicMapPlacePayload).toleranceKm : null,
);

const sortedFeatures = computed(() =>
  [...features.value].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
);
const filterText = ref('');
const filteredFeatures = computed(() => {
  const needle = filterText.value.trim().toLocaleLowerCase('fr');
  if (!needle) return sortedFeatures.value;
  return sortedFeatures.value.filter((f) => f.name.toLocaleLowerCase('fr').includes(needle));
});

const projectedPoint = computed(() => {
  if (!freeformPoint.value || !projection.value) return null;
  return projection.value([freeformPoint.value.lng, freeformPoint.value.lat]);
});

function onSvgClick(event: MouseEvent) {
  if (props.type !== 'MAP_PLACE') return;
  const svg = event.currentTarget as SVGSVGElement;
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return;
  const { x, y } = point.matrixTransform(ctm.inverse());
  selectPoint(x, y);
}

</script>

<template>
  <div>
    <p v-if="promptText" class="text-ink-muted">{{ promptText }}</p>
    <p v-if="toleranceKm" class="text-sm text-ink-muted">
      Précision demandée : à moins de {{ toleranceKm }} km.
    </p>

    <div v-if="status === 'pending'" class="mt-4">
      <p class="sr-only" role="status">Chargement de la carte…</p>
      <BaseSkeleton class="h-48 w-full rounded-lg" aria-hidden="true" />
    </div>

    <div v-else-if="status === 'error'" class="mt-4 space-y-3">
      <BaseAlert variant="error" role="alert">{{ errorMessage }}</BaseAlert>
      <BaseButton type="button" variant="secondary" @click="load">Réessayer</BaseButton>
    </div>

    <template v-else>
      <svg
        :viewBox="`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`"
        aria-hidden="true"
        class="mt-4 w-full rounded-lg border border-hairline bg-surface"
        :class="type === 'MAP_PLACE' ? 'cursor-crosshair' : ''"
        @click="onSvgClick"
      >
        <path
          v-for="f in features"
          :key="f.id"
          :d="pathGenerator?.(f.geoJson) ?? undefined"
          stroke-width="0.3"
          class="stroke-hairline transition-colors"
          :class="[
            type === 'MAP_CLICK' ? 'cursor-pointer hover:fill-bg' : '',
            selectedFeatureId === f.id ? 'fill-accent-primary/30' : 'fill-surface',
          ]"
          @click="type === 'MAP_CLICK' ? selectFeature(f.id) : undefined"
        />
        <circle
          v-if="type === 'MAP_PLACE' && projectedPoint"
          :cx="projectedPoint[0]"
          :cy="projectedPoint[1]"
          r="1"
          class="fill-accent-primary"
        />
      </svg>

      <p v-if="dataset" class="mt-2 text-xs text-ink-muted">{{ dataset.attributionText }}</p>

      <fieldset class="mt-4">
        <legend class="text-sm font-medium text-ink-muted">
          {{ type === 'MAP_CLICK' ? 'Ou choisissez dans la liste' : 'Ou choisissez un lieu dans la liste' }}
        </legend>
        <BaseInput v-model="filterText" label="Filtrer" class="mt-2" />
        <div class="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-hairline p-2">
          <label
            v-for="f in filteredFeatures"
            :key="f.id"
            class="flex cursor-pointer items-center gap-2 rounded-sm p-1.5 has-[:checked]:bg-accent-primary/5"
          >
            <input
              type="radio"
              name="map-feature"
              class="accent-accent-primary"
              :checked="selectedFeatureId === f.id"
              @change="selectFeature(f.id)"
            />
            <span>{{ f.name }}</span>
          </label>
          <p v-if="filteredFeatures.length === 0" class="p-1.5 text-sm text-ink-muted">
            Aucun résultat.
          </p>
        </div>
      </fieldset>
    </template>
  </div>
</template>
