<script setup lang="ts">
import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import { useThemesQuery } from '../api/themes';

const { data: themes, status, error, refetch } = useThemesQuery();

function indexLabel(position: number): string {
  return String(position).padStart(2, '0');
}
</script>

<template>
  <section>
    <h1 class="font-display text-3xl font-bold">{{ $t('app.title') }}</h1>
    <p class="mt-2 max-w-md text-ink-muted">{{ $t('home.tagline') }}</p>

    <hr class="mt-8 max-w-xs border-t border-dashed border-hairline" />

    <h2 class="mt-8 text-sm font-medium uppercase tracking-wide text-ink-muted">
      {{ $t('home.sectionLabel') }}
    </h2>

    <div class="mt-4">
      <div v-if="status === 'pending'">
        <p class="sr-only" role="status">{{ $t('home.loading') }}</p>
        <ul class="grid gap-4 sm:grid-cols-2" aria-hidden="true">
          <li v-for="n in 4" :key="n" class="rounded-lg border border-hairline p-4">
            <BaseSkeleton class="h-4 w-6" />
            <BaseSkeleton class="mt-3 h-5 w-2/3" />
            <BaseSkeleton class="mt-2 h-4 w-full" />
          </li>
        </ul>
      </div>

      <div v-else-if="status === 'error'" class="space-y-3">
        <BaseAlert variant="error" role="alert">
          {{ error?.message ?? $t('home.loadError') }}
        </BaseAlert>
        <BaseButton type="button" variant="secondary" @click="refetch()">
          {{ $t('common.retry') }}
        </BaseButton>
      </div>

      <div v-else-if="themes?.length === 0" class="space-y-3">
        <p class="text-ink-muted">{{ $t('home.empty') }}</p>
        <BaseButton type="button" variant="secondary" @click="refetch()">
          {{ $t('common.retry') }}
        </BaseButton>
      </div>

      <ul v-else class="grid gap-4 sm:grid-cols-2">
        <li v-for="(theme, index) in themes" :key="theme.id">
          <RouterLink
            :to="{ name: 'theme', params: { slug: theme.slug } }"
            class="block rounded-lg border border-hairline p-4 hover:border-accent-primary hover:shadow-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
          >
            <span class="font-data text-sm tabular-nums text-accent-primary">
              {{ indexLabel(index + 1) }}
            </span>
            <h3 class="font-display mt-1 text-lg font-semibold">{{ theme.name }}</h3>
            <p class="mt-1 text-sm text-ink-muted">{{ theme.description }}</p>
          </RouterLink>
        </li>
      </ul>
    </div>
  </section>
</template>
