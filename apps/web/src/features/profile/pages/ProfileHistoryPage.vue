<script setup lang="ts">
import { ref } from 'vue';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import { useMyAttemptsQuery } from '../api/me';

const page = ref(1);
const { data: attemptsPage, status, error } = useMyAttemptsQuery(() => page.value);

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
</script>

<template>
  <section class="mx-auto max-w-2xl">
    <h1 class="font-display text-2xl font-bold">{{ $t('profileHistory.title') }}</h1>

    <LoadingSpinner
      v-if="status === 'pending'"
      :label="$t('profileHistory.loading')"
      class="mt-4"
    />
    <BaseAlert v-else-if="status === 'error'" variant="error" role="alert" class="mt-4">
      {{ error?.message ?? $t('profileHistory.loadError') }}
    </BaseAlert>

    <template v-else-if="attemptsPage">
      <p v-if="attemptsPage.items.length === 0" class="mt-4 text-ink-muted">
        {{ $t('profileHistory.empty') }}
      </p>

      <ul v-else class="mt-4 space-y-3">
        <li
          v-for="attempt in attemptsPage.items"
          :key="attempt.id"
          class="rounded-lg border border-hairline p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <RouterLink
              :to="{ name: 'quiz-detail', params: { slug: attempt.quizSlug } }"
              class="font-semibold text-accent-primary hover:underline"
            >
              {{ attempt.quizTitle }}
            </RouterLink>
            <span class="font-data text-sm font-medium tabular-nums text-ink">
              {{ attempt.score }} / {{ attempt.maxScore }}
            </span>
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <span>{{ formatDate(attempt.startedAt) }}</span>
            <span
              v-if="!attempt.countsForRanking"
              class="rounded-full bg-accent-secondary/10 px-2 py-0.5 text-accent-secondary-strong"
            >
              {{ $t('profileHistory.trainingMode') }}
            </span>
          </div>
        </li>
      </ul>

      <BasePagination
        v-if="attemptsPage.totalPages > 1"
        class="mt-6"
        :page="attemptsPage.page"
        :total-pages="attemptsPage.totalPages"
        @update:page="page = $event"
      />
    </template>
  </section>
</template>
