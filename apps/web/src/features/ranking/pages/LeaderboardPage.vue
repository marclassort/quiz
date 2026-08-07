<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { LeaderboardScope } from '@quiz/shared';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import { useAuthStore } from '@/stores/auth';
import { useThemesQuery } from '@/features/quiz/api/themes';
import { useLeaderboardQuery, useMyRankQuery } from '../api/leaderboard';

const authStore = useAuthStore();

const scope = ref<LeaderboardScope>('global');
const themeSlug = ref<string | undefined>(undefined);
const page = ref(1);

const { data: themes } = useThemesQuery();

// Sélectionne le premier thème disponible dès qu'on bascule sur la vue "par thème".
watch(
  [scope, themes],
  ([currentScope, currentThemes]) => {
    if (currentScope === 'theme' && !themeSlug.value && currentThemes && currentThemes.length > 0) {
      themeSlug.value = currentThemes[0]?.slug;
    }
  },
  { immediate: true },
);

watch([scope, themeSlug], () => {
  page.value = 1;
});

const {
  data: leaderboardPage,
  status,
  error,
  refetch,
} = useLeaderboardQuery(
  () => scope.value,
  () => themeSlug.value,
  () => page.value,
);

const { data: myRank, status: myRankStatus } = useMyRankQuery();

const accuracyLabel = (accuracy: number) => `${Math.round(accuracy * 100)}%`;

const myRankMessage = computed(() => {
  if (!myRank.value) return null;
  if (myRank.value.reason === 'opted-out') return 'leaderboard.myRank.optedOut';
  if (myRank.value.reason === 'not-eligible') return 'leaderboard.myRank.notEligible';
  return null;
});
</script>

<template>
  <section class="mx-auto max-w-2xl">
    <h1 class="font-display text-2xl font-bold">{{ $t('leaderboard.title') }}</h1>

    <div class="mt-4 flex flex-wrap gap-3">
      <label class="text-sm text-ink-muted">
        {{ $t('leaderboard.scopeLabel') }}
        <select
          v-model="scope"
          class="ml-2 rounded-sm border-0 px-2 py-1 text-sm ring-1 ring-inset ring-hairline focus:outline focus:outline-2 focus:outline-accent-primary"
        >
          <option value="global">{{ $t('leaderboard.scope.global') }}</option>
          <option value="theme">{{ $t('leaderboard.scope.theme') }}</option>
          <option value="30d">{{ $t('leaderboard.scope.30d') }}</option>
        </select>
      </label>

      <label v-if="scope === 'theme'" class="text-sm text-ink-muted">
        {{ $t('leaderboard.themeLabel') }}
        <select
          v-model="themeSlug"
          class="ml-2 rounded-sm border-0 px-2 py-1 text-sm ring-1 ring-inset ring-hairline focus:outline focus:outline-2 focus:outline-accent-primary"
        >
          <option v-for="theme in themes" :key="theme.id" :value="theme.slug">
            {{ theme.name }}
          </option>
        </select>
      </label>
    </div>

    <div v-if="authStore.isAuthenticated && myRankStatus === 'success' && myRank" class="mt-4">
      <BaseAlert v-if="myRankMessage" variant="info">
        {{ $t(myRankMessage) }}
      </BaseAlert>
      <BaseAlert v-else-if="myRank.rank !== null" variant="info">
        {{ $t('leaderboard.myRank.value', { rank: myRank.rank }) }}
      </BaseAlert>
    </div>

    <div v-if="status === 'pending'" class="mt-6">
      <p class="sr-only" role="status">{{ $t('leaderboard.loading') }}</p>
      <div class="space-y-2" aria-hidden="true">
        <BaseSkeleton v-for="n in 6" :key="n" class="h-8 w-full" />
      </div>
    </div>
    <div v-else-if="status === 'error'" class="mt-6 space-y-3">
      <BaseAlert variant="error" role="alert">
        {{ error?.message ?? $t('leaderboard.loadError') }}
      </BaseAlert>
      <BaseButton type="button" variant="secondary" @click="refetch()">
        {{ $t('common.retry') }}
      </BaseButton>
    </div>

    <template v-else-if="leaderboardPage">
      <p v-if="leaderboardPage.items.length === 0" class="mt-6 text-ink-muted">
        {{ $t('leaderboard.empty') }}
      </p>

      <table v-else class="mt-6 w-full text-left text-sm">
        <caption class="sr-only">
          {{
            $t('leaderboard.title')
          }}
        </caption>
        <thead>
          <tr class="border-b border-hairline text-xs uppercase text-ink-muted">
            <th scope="col" class="py-2 pr-2">{{ $t('leaderboard.columns.rank') }}</th>
            <th scope="col" class="py-2 pr-2">{{ $t('leaderboard.columns.displayName') }}</th>
            <th scope="col" class="py-2 pr-2">{{ $t('leaderboard.columns.totalScore') }}</th>
            <th scope="col" class="py-2 pr-2">{{ $t('leaderboard.columns.accuracy') }}</th>
            <th scope="col" class="py-2">{{ $t('leaderboard.columns.quizzesCompleted') }}</th>
          </tr>
        </thead>
        <tbody class="font-data tabular-nums">
          <tr
            v-for="entry in leaderboardPage.items"
            :key="entry.userId"
            class="border-b border-hairline"
            :class="{ 'bg-accent-primary/10 font-medium': entry.userId === authStore.user?.id }"
          >
            <td class="py-2 pr-2">{{ entry.rank }}</td>
            <td class="py-2 pr-2 font-sans">{{ entry.displayName }}</td>
            <td class="py-2 pr-2">{{ entry.totalScore }}</td>
            <td class="py-2 pr-2">{{ accuracyLabel(entry.averageAccuracy) }}</td>
            <td class="py-2">{{ entry.quizzesCompleted }}</td>
          </tr>
        </tbody>
      </table>

      <BasePagination
        v-if="leaderboardPage.totalPages > 1"
        class="mt-6"
        :page="leaderboardPage.page"
        :total-pages="leaderboardPage.totalPages"
        @update:page="page = $event"
      />
    </template>
  </section>
</template>
