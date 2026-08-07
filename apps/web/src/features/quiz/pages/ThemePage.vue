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
      <h1 class="font-display text-2xl font-bold">{{ theme.name }}</h1>
      <p class="mt-1 text-ink-muted">{{ theme.description }}</p>

      <div class="mt-6">
        <LoadingSpinner v-if="quizzesStatus === 'pending'" :label="$t('theme.quizzesLoading')" />
        <BaseAlert v-else-if="quizzesStatus === 'error'" variant="error" role="alert">
          {{ quizzesError?.message ?? $t('theme.quizzesError') }}
        </BaseAlert>
        <p v-else-if="quizzesPage?.items.length === 0" class="text-ink-muted">
          {{ $t('theme.empty') }}
        </p>
        <ul v-else class="mt-2 grid gap-4 sm:grid-cols-2">
          <li v-for="quiz in quizzesPage?.items" :key="quiz.id">
            <RouterLink
              :to="{ name: 'quiz-detail', params: { slug: quiz.slug } }"
              class="block rounded-lg border border-hairline p-4 hover:border-accent-primary hover:shadow-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
            >
              <h2 class="text-lg font-semibold">{{ quiz.title }}</h2>
              <p class="mt-1 text-sm text-ink-muted">{{ quiz.description }}</p>
              <p class="mt-2 text-xs font-medium text-ink-muted">
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
