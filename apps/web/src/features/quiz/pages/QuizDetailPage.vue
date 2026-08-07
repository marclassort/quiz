<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import { useSeoMeta } from '@/lib/seo';
import { useQuizQuery } from '../api/quizzes';

const props = defineProps<{ slug: string }>();
const { t } = useI18n();

const { data: quiz, status, error } = useQuizQuery(() => props.slug);

useSeoMeta({
  title: () => (quiz.value ? t('quizDetail.seoTitle', { title: quiz.value.title }) : undefined),
  description: () => quiz.value?.description,
  jsonLd: () =>
    quiz.value
      ? {
          '@context': 'https://schema.org',
          '@type': 'Quiz',
          name: quiz.value.title,
          description: quiz.value.description,
          educationalLevel: quiz.value.difficulty,
          numberOfQuestions: quiz.value.questionCount,
        }
      : undefined,
});

const timeLimitLabel = computed(() => {
  if (!quiz.value?.timeLimitSeconds) return null;
  const minutes = Math.round(quiz.value.timeLimitSeconds / 60);
  return `${minutes} min`;
});
</script>

<template>
  <section class="mx-auto max-w-2xl">
    <LoadingSpinner v-if="status === 'pending'" :label="$t('quizDetail.loading')" />
    <BaseAlert v-else-if="status === 'error'" variant="error" role="alert">
      {{ error?.message ?? $t('quizDetail.notFound') }}
    </BaseAlert>

    <template v-else-if="quiz">
      <h1 class="font-display text-2xl font-bold">{{ quiz.title }}</h1>
      <p class="mt-2 text-ink-muted">{{ quiz.description }}</p>

      <dl class="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-muted">
        <div class="flex gap-1">
          <dt class="font-medium">{{ $t('quizDetail.difficultyLabel') }}</dt>
          <dd>{{ $t(`quiz.difficulty.${quiz.difficulty}`) }}</dd>
        </div>
        <div class="flex gap-1">
          <dt class="font-medium">{{ $t('quizDetail.questionsLabel') }}</dt>
          <dd>{{ quiz.questionCount }}</dd>
        </div>
        <div v-if="timeLimitLabel" class="flex gap-1">
          <dt class="font-medium">{{ $t('quizDetail.timeLimitLabel') }}</dt>
          <dd>{{ timeLimitLabel }}</dd>
        </div>
      </dl>

      <RouterLink
        :to="{ name: 'quiz-play', params: { slug: quiz.slug } }"
        class="mt-6 inline-block"
      >
        <BaseButton>{{ $t('quizDetail.start') }}</BaseButton>
      </RouterLink>
    </template>
  </section>
</template>
