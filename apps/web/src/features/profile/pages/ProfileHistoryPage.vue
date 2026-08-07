<script setup lang="ts">
import { ref } from 'vue';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import { useMyAttemptsQuery } from '../api/me';

const page = ref(1);
const { data: attemptsPage, status, error, refetch } = useMyAttemptsQuery(() => page.value);

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

    <div v-if="status === 'pending'" class="mt-4">
      <p class="sr-only" role="status">{{ $t('profileHistory.loading') }}</p>
      <div class="space-y-3" aria-hidden="true">
        <BaseSkeleton v-for="n in 3" :key="n" class="h-16 w-full rounded-lg" />
      </div>
    </div>
    <div v-else-if="status === 'error'" class="mt-4 space-y-3">
      <BaseAlert variant="error" role="alert">
        {{ error?.message ?? $t('profileHistory.loadError') }}
      </BaseAlert>
      <BaseButton type="button" variant="secondary" @click="refetch()">
        {{ $t('common.retry') }}
      </BaseButton>
    </div>

    <template v-else-if="attemptsPage">
      <div v-if="attemptsPage.items.length === 0" class="mt-4 space-y-3">
        <p class="text-ink-muted">{{ $t('profileHistory.empty') }}</p>
        <RouterLink :to="{ name: 'home' }" class="inline-block">
          <BaseButton type="button" variant="secondary">{{ $t('nav.home') }}</BaseButton>
        </RouterLink>
      </div>

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
