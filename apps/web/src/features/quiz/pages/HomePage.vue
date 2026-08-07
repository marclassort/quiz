<script setup lang="ts">
import BaseAlert from '@/components/ui/BaseAlert.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import { useThemesQuery } from '../api/themes';

const { data: themes, status, error } = useThemesQuery();
</script>

<template>
  <section>
    <h1 class="font-display text-2xl font-bold">{{ $t('home.title') }}</h1>
    <p class="mt-1 text-ink-muted">{{ $t('home.subtitle') }}</p>

    <div class="mt-6">
      <LoadingSpinner v-if="status === 'pending'" :label="$t('home.loading')" />
      <BaseAlert v-else-if="status === 'error'" variant="error" role="alert">
        {{ error?.message ?? $t('home.loadError') }}
      </BaseAlert>
      <p v-else-if="themes?.length === 0" class="text-ink-muted">
        {{ $t('home.empty') }}
      </p>
      <ul v-else class="mt-2 grid gap-4 sm:grid-cols-2">
        <li v-for="theme in themes" :key="theme.id">
          <RouterLink
            :to="{ name: 'theme', params: { slug: theme.slug } }"
            class="block rounded-lg border border-hairline p-4 hover:border-accent-primary hover:shadow-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
          >
            <h2 class="text-lg font-semibold">{{ theme.name }}</h2>
            <p class="mt-1 text-sm text-ink-muted">{{ theme.description }}</p>
          </RouterLink>
        </li>
      </ul>
    </div>
  </section>
</template>
