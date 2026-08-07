<script setup lang="ts">
import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav.vue';
import DifficultyGauge from '../components/DifficultyGauge.vue';
import { useThemeQuery } from '../api/themes';
import { useQuizzesQuery } from '../api/quizzes';

const props = defineProps<{ slug: string }>();

const {
  data: theme,
  status: themeStatus,
  error: themeError,
  refetch: refetchTheme,
} = useThemeQuery(() => props.slug);
const {
  data: quizzesPage,
  status: quizzesStatus,
  error: quizzesError,
  refetch: refetchQuizzes,
} = useQuizzesQuery(() => props.slug);
</script>

<template>
  <section>
    <div v-if="themeStatus === 'pending'">
      <p class="sr-only" role="status">{{ $t('theme.loading') }}</p>
      <div aria-hidden="true">
        <BaseSkeleton class="h-4 w-40" />
        <BaseSkeleton class="mt-4 h-8 w-2/3" />
        <BaseSkeleton class="mt-2 h-4 w-full" />
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <div v-for="n in 4" :key="n" class="rounded-lg border border-hairline p-4">
            <BaseSkeleton class="h-5 w-2/3" />
            <BaseSkeleton class="mt-2 h-4 w-1/2" />
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="themeStatus === 'error'" class="space-y-3">
      <BaseAlert variant="error" role="alert">
        {{ themeError?.message ?? $t('theme.notFound') }}
      </BaseAlert>
      <BaseButton type="button" variant="secondary" @click="refetchTheme()">
        {{ $t('common.retry') }}
      </BaseButton>
    </div>

    <template v-else-if="theme">
      <BreadcrumbNav
        :items="[{ label: $t('nav.home'), to: { name: 'home' } }, { label: theme.name }]"
      />
      <h1 class="font-display mt-4 text-2xl font-bold">{{ theme.name }}</h1>
      <p class="mt-1 text-ink-muted">{{ theme.description }}</p>

      <div class="mt-6">
        <div v-if="quizzesStatus === 'pending'">
          <p class="sr-only" role="status">{{ $t('theme.quizzesLoading') }}</p>
          <div class="grid gap-4 sm:grid-cols-2" aria-hidden="true">
            <div v-for="n in 4" :key="n" class="rounded-lg border border-hairline p-4">
              <BaseSkeleton class="h-5 w-2/3" />
              <BaseSkeleton class="mt-2 h-4 w-1/2" />
            </div>
          </div>
        </div>

        <div v-else-if="quizzesStatus === 'error'" class="space-y-3">
          <BaseAlert variant="error" role="alert">
            {{ quizzesError?.message ?? $t('theme.quizzesError') }}
          </BaseAlert>
          <BaseButton type="button" variant="secondary" @click="refetchQuizzes()">
            {{ $t('common.retry') }}
          </BaseButton>
        </div>

        <p v-else-if="quizzesPage?.items.length === 0" class="text-ink-muted">
          {{ $t('theme.empty') }}
        </p>

        <ul v-else class="grid gap-4 sm:grid-cols-2">
          <li v-for="quiz in quizzesPage?.items" :key="quiz.id">
            <RouterLink
              :to="{ name: 'quiz-detail', params: { slug: quiz.slug } }"
              class="block rounded-lg border border-hairline p-4 hover:border-accent-primary hover:shadow-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
            >
              <h2 class="font-display text-lg font-semibold">{{ quiz.title }}</h2>
              <p class="mt-1 text-sm text-ink-muted">{{ quiz.description }}</p>
              <p class="mt-2 flex items-center gap-2 text-xs font-medium text-ink-muted">
                <DifficultyGauge :difficulty="quiz.difficulty" />
                <span aria-hidden="true">·</span>
                <span class="font-data tabular-nums">
                  {{ $t('common.questionsCount', { count: quiz.questionCount }) }}
                </span>
              </p>
            </RouterLink>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>
