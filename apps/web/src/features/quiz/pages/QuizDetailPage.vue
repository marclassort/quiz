<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav.vue';
import { useSeoMeta } from '@/lib/seo';
import DifficultyGauge from '../components/DifficultyGauge.vue';
import RouteProgress from '../components/RouteProgress.vue';
import { useQuizQuery } from '../api/quizzes';

const props = defineProps<{ slug: string }>();
const { t } = useI18n();

const { data: quiz, status, error, refetch } = useQuizQuery(() => props.slug);

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

const durationLabel = computed(() => {
  if (!quiz.value?.timeLimitSeconds) return null;
  const minutes = Math.round(quiz.value.timeLimitSeconds / 60);
  return t('quizDetail.durationValue', { minutes });
});
</script>

<template>
  <section class="mx-auto max-w-2xl">
    <div v-if="status === 'pending'">
      <p class="sr-only" role="status">{{ $t('quizDetail.loading') }}</p>
      <div aria-hidden="true">
        <BaseSkeleton class="h-4 w-32" />
        <BaseSkeleton class="mt-4 h-8 w-2/3" />
        <BaseSkeleton class="mt-2 h-4 w-full" />
        <BaseSkeleton class="mt-6 h-24 w-full rounded-lg" />
      </div>
    </div>

    <div v-else-if="status === 'error'" class="space-y-3">
      <BaseAlert variant="error" role="alert">
        {{ error?.message ?? $t('quizDetail.notFound') }}
      </BaseAlert>
      <BaseButton type="button" variant="secondary" @click="refetch()">
        {{ $t('common.retry') }}
      </BaseButton>
    </div>

    <template v-else-if="quiz">
      <BreadcrumbNav :items="[{ label: $t('nav.home'), to: { name: 'home' } }, { label: quiz.title }]" />
      <h1 class="font-display mt-4 text-2xl font-bold">{{ quiz.title }}</h1>
      <p class="mt-2 text-ink-muted">{{ quiz.description }}</p>

      <div class="mt-6 rounded-lg border border-hairline p-4">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <DifficultyGauge :difficulty="quiz.difficulty" />
          <span aria-hidden="true" class="text-ink-muted">·</span>
          <span class="font-data tabular-nums text-ink-muted">
            {{ $t('common.questionsCount', { count: quiz.questionCount }) }}
          </span>
          <template v-if="durationLabel">
            <span aria-hidden="true" class="text-ink-muted">·</span>
            <span class="font-data tabular-nums text-ink-muted">{{ durationLabel }}</span>
          </template>
        </div>

        <div aria-hidden="true" class="mt-4">
          <RouteProgress :current="0" :total="quiz.questionCount" />
        </div>
      </div>

      <RouterLink
        :to="{ name: 'quiz-play', params: { slug: quiz.slug } }"
        class="mt-6 inline-block"
      >
        <BaseButton>{{ $t('quizDetail.start') }}</BaseButton>
      </RouterLink>
    </template>
  </section>
</template>
