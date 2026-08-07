<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useQuery } from '@pinia/colada';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import { useAuthStore } from '@/stores/auth';
import { finishAttempt } from '../api/attempts';

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
} = useQuery({
  key: () => ['attempt-result', props.attemptId],
  query: () => finishAttempt(props.attemptId),
});

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
    <LoadingSpinner v-if="status === 'pending'" :label="$t('quizResult.loading')" />
    <BaseAlert v-else-if="status === 'error'" variant="error" role="alert">
      {{ error?.message ?? $t('quizResult.loadError') }}
    </BaseAlert>

    <template v-else-if="result">
      <h1 class="font-display text-2xl font-bold">{{ $t('quizResult.title') }}</h1>

      <p class="mt-4 font-data text-4xl font-bold tabular-nums text-accent-primary">
        {{ result.score }} / {{ result.maxScore }}
        <span v-if="accuracyLabel" class="text-lg font-medium text-ink-muted"
          >({{ accuracyLabel }})</span
        >
      </p>

      <dl class="mt-4 space-y-1 text-sm text-ink-muted">
        <div class="flex gap-1">
          <dt class="font-medium">{{ $t('quizResult.correctAnswers') }}</dt>
          <dd class="font-data tabular-nums">{{ result.correctAnswers }} / {{ result.totalAnswers }}</dd>
        </div>
        <div v-if="durationLabel" class="flex gap-1">
          <dt class="font-medium">{{ $t('quizResult.duration') }}</dt>
          <dd class="font-data tabular-nums">{{ durationLabel }}</dd>
        </div>
      </dl>

      <BaseAlert v-if="!result.countsForRanking" variant="info" class="mt-4">
        {{ $t('quizResult.trainingModeNotice') }}
      </BaseAlert>

      <BaseAlert v-if="!authStore.isAuthenticated" variant="info" class="mt-6">
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

      <RouterLink
        :to="{ name: 'quiz-detail', params: { slug: props.slug } }"
        class="mt-6 inline-block"
      >
        <BaseButton variant="secondary">{{ $t('quizResult.backToQuiz') }}</BaseButton>
      </RouterLink>
    </template>
  </section>
</template>
