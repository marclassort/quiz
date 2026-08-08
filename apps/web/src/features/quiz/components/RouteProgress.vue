<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ current: number; total: number }>();

function ratio(index: number): number {
  return props.total > 1 ? index / (props.total - 1) : 0;
}

function pointLeft(index: number): string {
  return `calc(8px + ${ratio(index)} * (100% - 16px))`;
}

// `current` peut valoir 0 (aperçu d'un parcours pas encore commencé sur la
// fiche de quiz) : hors du domaine [1, total] du ratio, on écrête donc.
const sailedRatio = computed(() => Math.max(0, ratio(props.current - 1)));
const ariaValueNow = computed(() => Math.min(Math.max(props.current, 1), props.total));
</script>

<template>
  <div
    class="flex items-center gap-3"
    role="progressbar"
    :aria-valuemin="1"
    :aria-valuemax="total"
    :aria-valuenow="ariaValueNow"
    :aria-valuetext="$t('quizPlay.progress', { current, total })"
  >
    <div class="relative h-6 w-full max-w-xs" aria-hidden="true">
      <div
        class="absolute left-2 right-2 top-1/2 h-0 -translate-y-1/2 border-t border-dashed border-hairline"
      />
      <div
        class="route-progress__sailed absolute left-2 right-2 top-1/2 h-0 origin-left -translate-y-1/2 border-t-2 border-accent-primary"
        :style="{ transform: `translateY(-50%) scaleX(${sailedRatio})` }"
      />
      <span
        v-for="index in total"
        :key="index"
        class="route-progress__point absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
        :style="{ left: pointLeft(index - 1) }"
      >
        <span
          v-if="index === current"
          class="block h-3 w-3 rotate-45 border-2 border-surface bg-accent-primary"
        />
        <span
          v-else
          class="block h-2 w-2 rounded-full"
          :class="index < current ? 'bg-accent-primary' : 'border border-hairline bg-surface'"
        />
      </span>
    </div>
    <span class="font-data whitespace-nowrap text-sm tabular-nums text-ink-muted">
      {{ current }}/{{ total }}
    </span>
  </div>
</template>

<style scoped>
.route-progress__sailed {
  transition: transform var(--duration-slow) var(--ease-route);
}

.route-progress__point {
  transition: left var(--duration-base) var(--ease-standard);
}

@media (prefers-reduced-motion: reduce) {
  .route-progress__sailed,
  .route-progress__point {
    transition: none;
  }
}
</style>
