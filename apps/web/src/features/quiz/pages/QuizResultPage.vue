<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useQuery } from '@pinia/colada';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import { useAuthStore } from '@/stores/auth';
import RouteProgress from '../components/RouteProgress.vue';
import { finishAttempt } from '../api/attempts';
import { useQuizQuery } from '../api/quizzes';

const props = defineProps<{ slug: string; attemptId: string }>();
const route = useRoute();
const authStore = useAuthStore();
const { t } = useI18n();

// POST /attempts/:id/finish est idempotent côté serveur : le rappeler ici
// permet à cette page de fonctionner en accès direct (rechargement, lien
// partagé) sans dépendre d'un état transmis par la page de jeu — l'état de
// vérité reste le serveur (claude.md §8).
const {
  data: result,
  status,
  error,
  refetch,
} = useQuery({
  key: () => ['attempt-result', props.attemptId],
  query: () => finishAttempt(props.attemptId),
});

// Déjà en cache depuis la fiche de quiz consultée juste avant de jouer : sert
// uniquement de repère de contexte (titre du quiz), pas de coût réseau
// supplémentaire dans le cas courant.
const { data: quiz } = useQuizQuery(() => props.slug);

const accuracyLabel = computed(() => {
  if (!result.value || result.value.maxScore === 0) return null;
  return `${Math.round((result.value.score / result.value.maxScore) * 100)}%`;
});

const durationLabel = computed(() => {
  if (!result.value) return null;
  const seconds = Math.round(result.value.durationMs / 1000);
  return t('quizResult.durationValue', {
    minutes: Math.floor(seconds / 60),
    seconds: seconds % 60,
  });
});
</script>

<template>
  <section class="mx-auto max-w-xl">
    <div v-if="status === 'pending'">
      <p class="sr-only" role="status">{{ $t('quizResult.loading') }}</p>
      <div aria-hidden="true">
        <BaseSkeleton class="h-4 w-40" />
        <BaseSkeleton class="mt-3 h-9 w-32" />
        <BaseSkeleton class="mt-6 h-12 w-48" />
        <BaseSkeleton class="mt-6 h-6 w-full max-w-xs" />
        <div class="mt-6 grid grid-cols-2 gap-3">
          <BaseSkeleton class="h-16 w-full rounded-lg" />
          <BaseSkeleton class="h-16 w-full rounded-lg" />
        </div>
      </div>
    </div>

    <div v-else-if="status === 'error'" class="space-y-3">
      <BaseAlert variant="error" role="alert">
        {{ error?.message ?? $t('quizResult.loadError') }}
      </BaseAlert>
      <BaseButton type="button" variant="secondary" @click="refetch()">
        {{ $t('common.retry') }}
      </BaseButton>
    </div>

    <template v-else-if="result">
      <p v-if="quiz" class="text-sm text-ink-muted">{{ quiz.title }}</p>
      <h1 class="font-display text-3xl font-bold">{{ $t('quizResult.title') }}</h1>

      <p class="mt-4 font-data text-5xl font-bold tabular-nums text-accent-primary">
        {{ result.score }} / {{ result.maxScore }}
        <span v-if="accuracyLabel" class="text-lg font-medium text-ink-muted"
          >({{ accuracyLabel }})</span
        >
      </p>

      <div aria-hidden="true" class="mt-6">
        <RouteProgress :current="result.totalAnswers" :total="result.totalAnswers" />
      </div>

      <dl class="mt-6 grid grid-cols-2 gap-3">
        <div class="rounded-lg border border-hairline p-3">
          <dt class="text-xs text-ink-muted">{{ $t('quizResult.correctAnswers') }}</dt>
          <dd class="font-data text-lg font-semibold tabular-nums">
            {{ result.correctAnswers }} / {{ result.totalAnswers }}
          </dd>
        </div>
        <div v-if="durationLabel" class="rounded-lg border border-hairline p-3">
          <dt class="text-xs text-ink-muted">{{ $t('quizResult.duration') }}</dt>
          <dd class="font-data text-lg font-semibold tabular-nums">{{ durationLabel }}</dd>
        </div>
      </dl>

      <BaseAlert v-if="!result.countsForRanking" variant="info" class="mt-6">
        {{ $t('quizResult.trainingModeNotice') }}
      </BaseAlert>

      <BaseAlert v-if="!authStore.isAuthenticated" variant="info" class="mt-4">
        <p class="font-medium">
          {{ $t('quizResult.registerIncitation') }}
        </p>
        <RouterLink
          :to="{ name: 'register', query: { redirect: route.fullPath } }"
          class="mt-2 inline-block"
        >
          <BaseButton>{{ $t('quizResult.createAccount') }}</BaseButton>
        </RouterLink>
      </BaseAlert>

      <div class="mt-6 flex flex-wrap gap-3">
        <RouterLink v-if="result.countsForRanking" :to="{ name: 'leaderboard' }">
          <BaseButton variant="secondary">{{ $t('quizResult.viewLeaderboard') }}</BaseButton>
        </RouterLink>
        <RouterLink :to="{ name: 'quiz-detail', params: { slug: props.slug } }">
          <BaseButton variant="secondary">{{ $t('quizResult.backToQuiz') }}</BaseButton>
        </RouterLink>
      </div>
    </template>
  </section>
</template>
