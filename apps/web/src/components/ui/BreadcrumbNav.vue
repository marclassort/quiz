<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

defineProps<{ items: { label: string; to?: RouteLocationRaw }[] }>();
</script>

<template>
  <nav :aria-label="$t('nav.breadcrumb')">
    <ol class="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
      <li v-for="(item, index) in items" :key="item.label" class="flex items-center gap-1.5">
        <RouterLink v-if="item.to" :to="item.to" class="hover:text-accent-primary">
          {{ item.label }}
        </RouterLink>
        <span v-else class="text-ink" aria-current="page">{{ item.label }}</span>
        <span v-if="index < items.length - 1" aria-hidden="true">›</span>
      </li>
    </ol>
  </nav>
</template>
