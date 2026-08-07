<script setup lang="ts">
import { computed } from 'vue';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import { useAdminStatsQuery } from '../api/stats';

const { data: stats, status, error } = useAdminStatsQuery();

const accuracyLabel = (rate: number) => `${Math.round(rate * 100)}%`;

// Les questions les moins réussies en premier : c'est là que l'admin doit
// regarder en priorité pour repérer une question mal formulée (claude.md §9).
const sortedSuccessRates = computed(() =>
  [...(stats.value?.questionSuccessRates ?? [])].sort((a, b) => a.successRate - b.successRate),
);
</script>

<template>
  <section>
    <h1 class="text-2xl font-bold">{{ $t('admin.dashboard.title') }}</h1>

    <nav class="mt-4 flex flex-wrap gap-4 text-sm font-medium">
      <RouterLink :to="{ name: 'admin-themes' }" class="text-blue-700 hover:underline">
        {{ $t('admin.nav.themes') }}
      </RouterLink>
      <RouterLink :to="{ name: 'admin-quizzes' }" class="text-blue-700 hover:underline">
        {{ $t('admin.nav.quizzes') }}
      </RouterLink>
      <RouterLink :to="{ name: 'admin-answer-reviews' }" class="text-blue-700 hover:underline">
        {{ $t('admin.nav.answerReviews') }}
      </RouterLink>
    </nav>

    <LoadingSpinner
      v-if="status === 'pending'"
      :label="$t('admin.dashboard.loading')"
      class="mt-6"
    />
    <BaseAlert v-else-if="status === 'error'" variant="error" role="alert" class="mt-6">
      {{ error?.message ?? $t('admin.dashboard.loadError') }}
    </BaseAlert>

    <template v-else-if="stats">
      <dl class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div class="rounded-lg border border-slate-200 p-4">
          <dt class="text-sm text-slate-500">{{ $t('admin.dashboard.totalAttempts') }}</dt>
          <dd class="text-2xl font-bold">{{ stats.totalAttempts }}</dd>
        </div>
        <div class="rounded-lg border border-slate-200 p-4">
          <dt class="text-sm text-slate-500">{{ $t('admin.dashboard.finishedAttempts') }}</dt>
          <dd class="text-2xl font-bold">{{ stats.finishedAttempts }}</dd>
        </div>
        <div class="rounded-lg border border-slate-200 p-4">
          <dt class="text-sm text-slate-500">{{ $t('admin.dashboard.totalQuizzes') }}</dt>
          <dd class="text-2xl font-bold">{{ stats.totalQuizzes }}</dd>
        </div>
        <div class="rounded-lg border border-slate-200 p-4">
          <dt class="text-sm text-slate-500">{{ $t('admin.dashboard.totalQuestions') }}</dt>
          <dd class="text-2xl font-bold">{{ stats.totalQuestions }}</dd>
        </div>
      </dl>

      <h2 class="mt-8 text-lg font-semibold">{{ $t('admin.dashboard.successRatesTitle') }}</h2>
      <p v-if="sortedSuccessRates.length === 0" class="mt-2 text-slate-600">
        {{ $t('admin.dashboard.noData') }}
      </p>
      <table v-else class="mt-2 w-full text-left text-sm">
        <thead>
          <tr class="border-b border-slate-200 text-xs uppercase text-slate-500">
            <th scope="col" class="py-2 pr-2">{{ $t('admin.dashboard.columns.statement') }}</th>
            <th scope="col" class="py-2 pr-2">{{ $t('admin.dashboard.columns.quiz') }}</th>
            <th scope="col" class="py-2">{{ $t('admin.dashboard.columns.successRate') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in sortedSuccessRates"
            :key="row.questionId"
            class="border-b border-slate-100"
          >
            <td class="py-2 pr-2">
              <RouterLink
                :to="{ name: 'admin-question-editor', params: { id: row.questionId } }"
                class="text-blue-700 hover:underline"
              >
                {{ row.statement }}
              </RouterLink>
            </td>
            <td class="py-2 pr-2 text-slate-600">{{ row.quizSlug }}</td>
            <td class="py-2">
              {{ accuracyLabel(row.successRate) }}
              <span class="text-xs text-slate-500"
                >({{ row.correctAnswers }}/{{ row.totalAnswers }})</span
              >
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </section>
</template>
