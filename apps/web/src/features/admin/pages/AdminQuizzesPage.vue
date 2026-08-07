<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { createQuizSchema, quizImportSchema } from '@quiz/shared';
import type { QuizDifficulty, QuizStatus } from '@quiz/shared';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BasePagination from '@/components/ui/BasePagination.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import { ApiError } from '@/lib/http';
import { useAdminThemesQuery } from '../api/themes';
import { useAdminQuizzesQuery, useCreateQuizMutation, useImportQuizMutation } from '../api/quizzes';

const router = useRouter();
const { t } = useI18n();

const { data: themes } = useAdminThemesQuery();

const themeFilter = ref('');
const statusFilter = ref<QuizStatus | ''>('');
const difficultyFilter = ref<QuizDifficulty | ''>('');
const page = ref(1);

const {
  data: quizzesPage,
  status,
  error,
} = useAdminQuizzesQuery(() => ({
  theme: themeFilter.value || undefined,
  status: statusFilter.value || undefined,
  difficulty: difficultyFilter.value || undefined,
  page: page.value,
}));

const { mutateAsync: createQuiz, isLoading: isCreating } = useCreateQuizMutation();
const { mutateAsync: importQuiz, isLoading: isImporting } = useImportQuizMutation();

const showCreateForm = ref(false);
const createForm = ref({
  themeSlug: '',
  slug: '',
  title: '',
  description: '',
  difficulty: 'EASY' as QuizDifficulty,
});
const createError = ref<string | null>(null);

async function onCreateSubmit() {
  createError.value = null;
  const parsed = createQuizSchema.safeParse(createForm.value);
  if (!parsed.success) {
    createError.value = parsed.error.issues[0]?.message ?? t('admin.quizzes.invalidForm');
    return;
  }
  try {
    const quiz = await createQuiz(parsed.data);
    await router.push({ name: 'admin-quiz-editor', params: { id: quiz.id } });
  } catch (err) {
    createError.value = err instanceof ApiError ? err.message : t('common.genericError');
  }
}

const importError = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

async function onImportFileChange(event: Event) {
  importError.value = null;
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const json = JSON.parse(text);
    const parsed = quizImportSchema.safeParse(json);
    if (!parsed.success) {
      importError.value = parsed.error.issues[0]?.message ?? t('admin.quizzes.invalidImportFile');
      return;
    }
    const quiz = await importQuiz(parsed.data);
    await router.push({ name: 'admin-quiz-editor', params: { id: quiz.id } });
  } catch {
    importError.value = t('admin.quizzes.invalidImportFile');
  } finally {
    if (fileInput.value) fileInput.value.value = '';
  }
}
</script>

<template>
  <section>
    <div class="flex items-center justify-between">
      <h1 class="font-display text-2xl font-bold">{{ $t('admin.quizzes.title') }}</h1>
      <div class="flex gap-2">
        <BaseButton type="button" variant="secondary" @click="fileInput?.click()">
          {{ isImporting ? $t('admin.quizzes.importing') : $t('admin.quizzes.import') }}
        </BaseButton>
        <input
          ref="fileInput"
          type="file"
          accept="application/json"
          class="hidden"
          @change="onImportFileChange"
        />
        <BaseButton type="button" @click="showCreateForm = !showCreateForm">
          {{ $t('admin.quizzes.create') }}
        </BaseButton>
      </div>
    </div>

    <BaseAlert v-if="importError" variant="error" role="alert" class="mt-4">
      {{ importError }}
    </BaseAlert>

    <form
      v-if="showCreateForm"
      class="mt-4 space-y-3 rounded-lg border border-hairline p-4"
      novalidate
      @submit.prevent="onCreateSubmit"
    >
      <label class="block text-sm text-ink-muted">
        {{ $t('admin.quizzes.fields.theme') }}
        <select
          v-model="createForm.themeSlug"
          class="mt-1 block w-full rounded-sm border-0 px-3 py-2 text-sm ring-1 ring-inset ring-hairline focus:outline focus:outline-2 focus:outline-accent-primary"
        >
          <option value="" disabled>{{ $t('admin.quizzes.fields.themePlaceholder') }}</option>
          <option v-for="theme in themes" :key="theme.id" :value="theme.slug">
            {{ theme.name }}
          </option>
        </select>
      </label>
      <BaseInput v-model="createForm.slug" :label="$t('admin.quizzes.fields.slug')" />
      <BaseInput v-model="createForm.title" :label="$t('admin.quizzes.fields.title')" />
      <BaseInput v-model="createForm.description" :label="$t('admin.quizzes.fields.description')" />
      <label class="block text-sm text-ink-muted">
        {{ $t('admin.quizzes.fields.difficulty') }}
        <select
          v-model="createForm.difficulty"
          class="mt-1 block w-full rounded-sm border-0 px-3 py-2 text-sm ring-1 ring-inset ring-hairline focus:outline focus:outline-2 focus:outline-accent-primary"
        >
          <option value="EASY">{{ $t('quiz.difficulty.EASY') }}</option>
          <option value="MEDIUM">{{ $t('quiz.difficulty.MEDIUM') }}</option>
          <option value="HARD">{{ $t('quiz.difficulty.HARD') }}</option>
        </select>
      </label>
      <BaseAlert v-if="createError" variant="error" role="alert" aria-live="polite">
        {{ createError }}
      </BaseAlert>
      <div class="flex gap-2">
        <BaseButton type="submit" :disabled="isCreating">{{ $t('admin.quizzes.save') }}</BaseButton>
        <BaseButton type="button" variant="secondary" @click="showCreateForm = false">
          {{ $t('admin.quizzes.cancel') }}
        </BaseButton>
      </div>
    </form>

    <div class="mt-6 flex flex-wrap gap-3">
      <label class="text-sm text-ink-muted">
        {{ $t('admin.quizzes.filters.theme') }}
        <select
          v-model="themeFilter"
          class="ml-2 rounded-sm border-0 px-2 py-1 text-sm ring-1 ring-inset ring-hairline"
        >
          <option value="">{{ $t('admin.quizzes.filters.all') }}</option>
          <option v-for="theme in themes" :key="theme.id" :value="theme.slug">
            {{ theme.name }}
          </option>
        </select>
      </label>
      <label class="text-sm text-ink-muted">
        {{ $t('admin.quizzes.filters.status') }}
        <select
          v-model="statusFilter"
          class="ml-2 rounded-sm border-0 px-2 py-1 text-sm ring-1 ring-inset ring-hairline"
        >
          <option value="">{{ $t('admin.quizzes.filters.all') }}</option>
          <option value="DRAFT">{{ $t('admin.quizzes.status.DRAFT') }}</option>
          <option value="PUBLISHED">{{ $t('admin.quizzes.status.PUBLISHED') }}</option>
          <option value="ARCHIVED">{{ $t('admin.quizzes.status.ARCHIVED') }}</option>
        </select>
      </label>
      <label class="text-sm text-ink-muted">
        {{ $t('admin.quizzes.filters.difficulty') }}
        <select
          v-model="difficultyFilter"
          class="ml-2 rounded-sm border-0 px-2 py-1 text-sm ring-1 ring-inset ring-hairline"
        >
          <option value="">{{ $t('admin.quizzes.filters.all') }}</option>
          <option value="EASY">{{ $t('quiz.difficulty.EASY') }}</option>
          <option value="MEDIUM">{{ $t('quiz.difficulty.MEDIUM') }}</option>
          <option value="HARD">{{ $t('quiz.difficulty.HARD') }}</option>
        </select>
      </label>
    </div>

    <LoadingSpinner v-if="status === 'pending'" :label="$t('admin.quizzes.loading')" class="mt-6" />
    <BaseAlert v-else-if="status === 'error'" variant="error" role="alert" class="mt-6">
      {{ error?.message ?? $t('admin.quizzes.loadError') }}
    </BaseAlert>

    <template v-else-if="quizzesPage">
      <p v-if="quizzesPage.items.length === 0" class="mt-6 text-ink-muted">
        {{ $t('admin.quizzes.empty') }}
      </p>
      <ul v-else class="mt-6 space-y-2">
        <li v-for="quiz in quizzesPage.items" :key="quiz.id">
          <RouterLink
            :to="{ name: 'admin-quiz-editor', params: { id: quiz.id } }"
            class="flex items-center justify-between gap-4 rounded-lg border border-hairline p-4 hover:border-accent-primary"
          >
            <div>
              <p class="font-semibold">{{ quiz.title }}</p>
              <p class="text-xs text-ink-muted">
                {{ quiz.theme.name }} · {{ $t(`quiz.difficulty.${quiz.difficulty}`) }} ·
                {{ quiz.questionCount }} questions
              </p>
            </div>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-medium"
              :class="{
                'bg-ink/10 text-ink-muted': quiz.status === 'DRAFT',
                'bg-success/10 text-success-strong': quiz.status === 'PUBLISHED',
                'bg-accent-secondary/10 text-accent-secondary-strong': quiz.status === 'ARCHIVED',
              }"
            >
              {{ $t(`admin.quizzes.status.${quiz.status}`) }}
            </span>
          </RouterLink>
        </li>
      </ul>

      <BasePagination
        v-if="quizzesPage.totalPages > 1"
        class="mt-6"
        :page="quizzesPage.page"
        :total-pages="quizzesPage.totalPages"
        @update:page="page = $event"
      />
    </template>
  </section>
</template>
