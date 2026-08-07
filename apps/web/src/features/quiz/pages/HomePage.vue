<script setup lang="ts">
import BaseAlert from '@/components/ui/BaseAlert.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import { useThemesQuery } from '../api/themes';

const { data: themes, status, error } = useThemesQuery();
</script>

<template>
  <section>
    <h1 class="text-2xl font-bold">{{ $t('home.title') }}</h1>
    <p class="mt-1 text-slate-600">{{ $t('home.subtitle') }}</p>

    <div class="mt-6">
      <LoadingSpinner v-if="status === 'pending'" :label="$t('home.loading')" />
      <BaseAlert v-else-if="status === 'error'" variant="error" role="alert">
        {{ error?.message ?? $t('home.loadError') }}
      </BaseAlert>
      <p v-else-if="themes?.length === 0" class="text-slate-600">
        {{ $t('home.empty') }}
      </p>
      <ul v-else class="mt-2 grid gap-4 sm:grid-cols-2">
        <li v-for="theme in themes" :key="theme.id">
          <RouterLink
            :to="{ name: 'theme', params: { slug: theme.slug } }"
            class="block rounded-lg border border-slate-200 p-4 hover:border-blue-400 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <h2 class="text-lg font-semibold">{{ theme.name }}</h2>
            <p class="mt-1 text-sm text-slate-600">{{ theme.description }}</p>
          </RouterLink>
        </li>
      </ul>
    </div>
  </section>
</template>
