<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import { useThemeQuery } from '../api/themes';
import { useQuizzesQuery } from '../api/quizzes';

const props = defineProps<{ slug: string }>();
const { t } = useI18n();

const { data: theme, status: themeStatus, error: themeError } = useThemeQuery(() => props.slug);
const {
  data: quizzesPage,
  status: quizzesStatus,
  error: quizzesError,
} = useQuizzesQuery(() => props.slug);
</script>

<template>
  <section>
    <LoadingSpinner v-if="themeStatus === 'pending'" :label="$t('theme.loading')" />
    <BaseAlert v-else-if="themeStatus === 'error'" variant="error" role="alert">
      {{ themeError?.message ?? $t('theme.notFound') }}
    </BaseAlert>

    <template v-else-if="theme">
      <h1 class="text-2xl font-bold">{{ theme.name }}</h1>
      <p class="mt-1 text-slate-600">{{ theme.description }}</p>

      <div class="mt-6">
        <LoadingSpinner v-if="quizzesStatus === 'pending'" :label="$t('theme.quizzesLoading')" />
        <BaseAlert v-else-if="quizzesStatus === 'error'" variant="error" role="alert">
          {{ quizzesError?.message ?? $t('theme.quizzesError') }}
        </BaseAlert>
        <p v-else-if="quizzesPage?.items.length === 0" class="text-slate-600">
          {{ $t('theme.empty') }}
        </p>
        <ul v-else class="mt-2 grid gap-4 sm:grid-cols-2">
          <li v-for="quiz in quizzesPage?.items" :key="quiz.id">
            <RouterLink
              :to="{ name: 'quiz-detail', params: { slug: quiz.slug } }"
              class="block rounded-lg border border-slate-200 p-4 hover:border-blue-400 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <h2 class="text-lg font-semibold">{{ quiz.title }}</h2>
              <p class="mt-1 text-sm text-slate-600">{{ quiz.description }}</p>
              <p class="mt-2 text-xs font-medium text-slate-500">
                {{
                  t('theme.quizMeta', {
                    difficulty: t(`quiz.difficulty.${quiz.difficulty}`),
                    count: quiz.questionCount,
                  })
                }}
              </p>
            </RouterLink>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>
