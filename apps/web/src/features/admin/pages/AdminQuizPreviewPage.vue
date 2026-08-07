<script setup lang="ts">
import BaseAlert from '@/components/ui/BaseAlert.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import { useAdminQuizPreviewQuery } from '../api/quizzes';

const props = defineProps<{ id: string }>();

const { data: quiz, status, error } = useAdminQuizPreviewQuery(() => props.id);
</script>

<template>
  <section class="mx-auto max-w-2xl">
    <LoadingSpinner v-if="status === 'pending'" :label="$t('admin.preview.loading')" />
    <BaseAlert v-else-if="status === 'error'" variant="error" role="alert">
      {{ error?.message ?? $t('admin.preview.loadError') }}
    </BaseAlert>

    <template v-else-if="quiz">
      <p class="text-sm font-medium text-blue-700">{{ $t('admin.preview.badge') }}</p>
      <h1 class="text-2xl font-bold">{{ quiz.title }}</h1>
      <p class="mt-1 text-slate-600">{{ quiz.description }}</p>

      <ol class="mt-6 space-y-6">
        <li
          v-for="question in quiz.questions"
          :key="question.id"
          class="rounded-lg border border-slate-200 p-4"
        >
          <p class="font-semibold">{{ question.position }}. {{ question.statement }}</p>
          <img
            v-if="question.imageUrl"
            :src="question.imageUrl"
            alt=""
            class="mt-2 max-h-48 rounded-md"
          />

          <ul v-if="question.choices.length > 0" class="mt-3 space-y-1 text-sm">
            <li
              v-for="choice in question.choices"
              :key="choice.id"
              class="flex items-center gap-2"
              :class="choice.isCorrect ? 'font-medium text-green-800' : 'text-slate-700'"
            >
              <span aria-hidden="true">{{ choice.isCorrect ? '✓' : '○' }}</span>
              <span>{{ choice.label }}</span>
              <span v-if="choice.isCorrect" class="text-xs"
                >({{ $t('admin.preview.correct') }})</span
              >
            </li>
          </ul>

          <ul v-else-if="question.acceptedAnswers.length > 0" class="mt-3 space-y-1 text-sm">
            <li v-for="answer in question.acceptedAnswers" :key="answer.id" class="text-slate-700">
              {{ answer.value }}
              <span v-if="answer.isPrimary" class="text-xs text-slate-500">
                ({{ $t('admin.preview.primary') }})
              </span>
            </li>
          </ul>

          <p class="mt-3 text-sm text-slate-600">
            <span class="font-medium">{{ $t('admin.preview.explanationLabel') }}</span>
            {{ question.explanation || $t('admin.preview.missing') }}
          </p>
          <p class="text-xs text-slate-500">
            <span class="font-medium">{{ $t('admin.preview.sourceLabel') }}</span>
            {{ question.source || $t('admin.preview.missing') }}
          </p>
        </li>
      </ol>
    </template>
  </section>
</template>
