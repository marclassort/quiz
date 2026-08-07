<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { createQuestionSchema, updateQuizSchema } from '@quiz/shared';
import type { ProblemDetails, QuestionType, QuizDifficulty } from '@quiz/shared';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import { ApiError } from '@/lib/http';
import { useAdminThemesQuery } from '../api/themes';
import {
  useAdminQuestionsQuery,
  useCreateQuestionMutation,
  useDeleteQuestionMutation,
} from '../api/questions';
import {
  exportQuiz,
  useAdminQuizQuery,
  useDeleteQuizMutation,
  usePublishQuizMutation,
  useUnpublishQuizMutation,
  useUpdateQuizMutation,
} from '../api/quizzes';

const props = defineProps<{ id: string }>();
const router = useRouter();
const { t } = useI18n();

const { data: quiz, status: quizStatus, error: quizError } = useAdminQuizQuery(() => props.id);
const { data: themes } = useAdminThemesQuery();
const { data: questionsPage, status: questionsStatus } = useAdminQuestionsQuery(() => ({
  quizId: props.id,
}));

const { mutateAsync: updateQuiz, isLoading: isSaving } = useUpdateQuizMutation();
const { mutateAsync: publishQuiz, isLoading: isPublishing } = usePublishQuizMutation();
const { mutateAsync: unpublishQuiz, isLoading: isUnpublishing } = useUnpublishQuizMutation();
const { mutateAsync: deleteQuiz } = useDeleteQuizMutation();
const { mutateAsync: createQuestion, isLoading: isCreatingQuestion } = useCreateQuestionMutation();
const { mutateAsync: deleteQuestion } = useDeleteQuestionMutation();

const form = ref({
  themeSlug: '',
  slug: '',
  title: '',
  description: '',
  difficulty: 'EASY' as QuizDifficulty,
  timeLimitSeconds: null as number | null,
  speedBonusEnabled: false,
});
const formError = ref<string | null>(null);
const saved = ref(false);

watchEffect(() => {
  if (quiz.value) {
    form.value = {
      themeSlug: quiz.value.theme.slug,
      slug: quiz.value.slug,
      title: quiz.value.title,
      description: quiz.value.description,
      difficulty: quiz.value.difficulty,
      timeLimitSeconds: quiz.value.timeLimitSeconds,
      speedBonusEnabled: quiz.value.speedBonusEnabled,
    };
  }
});

async function onSaveQuiz() {
  formError.value = null;
  saved.value = false;
  const parsed = updateQuizSchema.safeParse(form.value);
  if (!parsed.success) {
    formError.value = parsed.error.issues[0]?.message ?? t('admin.quizzes.invalidForm');
    return;
  }
  try {
    await updateQuiz({ id: props.id, input: parsed.data });
    saved.value = true;
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : t('common.genericError');
  }
}

const publishError = ref<string | null>(null);
const missingSourceIds = ref<string[]>([]);
const missingExplanationIds = ref<string[]>([]);

async function onPublish() {
  publishError.value = null;
  missingSourceIds.value = [];
  missingExplanationIds.value = [];
  try {
    await publishQuiz(props.id);
  } catch (err) {
    if (err instanceof ApiError) {
      publishError.value = err.message;
      const problem = err.problem as
        | (Partial<ProblemDetails> & {
            missingSourceQuestionIds?: string[];
            missingExplanationQuestionIds?: string[];
          })
        | undefined;
      missingSourceIds.value = problem?.missingSourceQuestionIds ?? [];
      missingExplanationIds.value = problem?.missingExplanationQuestionIds ?? [];
    } else {
      publishError.value = t('common.genericError');
    }
  }
}

async function onUnpublish() {
  publishError.value = null;
  try {
    await unpublishQuiz(props.id);
  } catch (err) {
    publishError.value = err instanceof ApiError ? err.message : t('common.genericError');
  }
}

const deleteError = ref<string | null>(null);

async function onDeleteQuiz() {
  deleteError.value = null;
  try {
    await deleteQuiz(props.id);
    await router.push({ name: 'admin-quizzes' });
  } catch (err) {
    deleteError.value = err instanceof ApiError ? err.message : t('common.genericError');
  }
}

async function onExport() {
  const data = await exportQuiz(props.id);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.slug}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

const showAddQuestion = ref(false);
const newQuestion = ref({ type: 'SINGLE_CHOICE' as QuestionType, statement: '', points: 1 });
const addQuestionError = ref<string | null>(null);

async function onAddQuestion() {
  addQuestionError.value = null;
  const nextPosition = (questionsPage.value?.items.length ?? 0) + 1;
  const parsed = createQuestionSchema.safeParse({
    quizId: props.id,
    position: nextPosition,
    type: newQuestion.value.type,
    statement: newQuestion.value.statement,
    points: newQuestion.value.points,
    explanation: '',
    source: '',
  });
  if (!parsed.success) {
    addQuestionError.value = parsed.error.issues[0]?.message ?? t('admin.quizzes.invalidForm');
    return;
  }
  try {
    const question = await createQuestion(parsed.data);
    await router.push({ name: 'admin-question-editor', params: { id: question.id } });
  } catch (err) {
    addQuestionError.value = err instanceof ApiError ? err.message : t('common.genericError');
  }
}

async function onDeleteQuestion(questionId: string) {
  try {
    await deleteQuestion(questionId);
  } catch {
    // Le cas le plus probable (question déjà répondue) est signalé par le
    // serveur avec un message clair ; pas d'affichage dédié pour ce lot,
    // l'admin peut réessayer avec une autre question.
  }
}

const isPublished = computed(() => quiz.value?.status === 'PUBLISHED');
</script>

<template>
  <section class="mx-auto max-w-3xl">
    <LoadingSpinner v-if="quizStatus === 'pending'" :label="$t('admin.quizzes.loading')" />
    <BaseAlert v-else-if="quizStatus === 'error'" variant="error" role="alert">
      {{ quizError?.message ?? $t('admin.quizzes.loadError') }}
    </BaseAlert>

    <template v-else-if="quiz">
      <div class="flex items-center justify-between">
        <h1 class="font-display text-2xl font-bold">{{ quiz.title }}</h1>
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
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <BaseButton v-if="!isPublished" type="button" :disabled="isPublishing" @click="onPublish">
          {{ $t('admin.quizzes.publish') }}
        </BaseButton>
        <BaseButton
          v-else
          type="button"
          variant="secondary"
          :disabled="isUnpublishing"
          @click="onUnpublish"
        >
          {{ $t('admin.quizzes.unpublish') }}
        </BaseButton>
        <RouterLink :to="{ name: 'admin-quiz-preview', params: { id: quiz.id } }">
          <BaseButton type="button" variant="secondary">{{
            $t('admin.quizzes.preview')
          }}</BaseButton>
        </RouterLink>
        <BaseButton type="button" variant="secondary" @click="onExport">
          {{ $t('admin.quizzes.export') }}
        </BaseButton>
        <BaseButton type="button" variant="danger" @click="onDeleteQuiz">
          {{ $t('admin.quizzes.delete') }}
        </BaseButton>
      </div>

      <BaseAlert v-if="publishError" variant="error" role="alert" class="mt-4">
        {{ publishError }}
      </BaseAlert>
      <BaseAlert v-if="deleteError" variant="error" role="alert" class="mt-4">
        {{ deleteError }}
      </BaseAlert>

      <form
        class="mt-6 space-y-3 rounded-lg border border-hairline p-4"
        novalidate
        @submit.prevent="onSaveQuiz"
      >
        <h2 class="font-semibold">{{ $t('admin.quizzes.editTitle') }}</h2>
        <label class="block text-sm text-ink-muted">
          {{ $t('admin.quizzes.fields.theme') }}
          <select
            v-model="form.themeSlug"
            class="mt-1 block w-full rounded-sm border-0 px-3 py-2 text-sm ring-1 ring-inset ring-hairline focus:outline focus:outline-2 focus:outline-accent-primary"
          >
            <option v-for="theme in themes" :key="theme.id" :value="theme.slug">
              {{ theme.name }}
            </option>
          </select>
        </label>
        <BaseInput v-model="form.slug" :label="$t('admin.quizzes.fields.slug')" />
        <BaseInput v-model="form.title" :label="$t('admin.quizzes.fields.title')" />
        <BaseInput v-model="form.description" :label="$t('admin.quizzes.fields.description')" />
        <label class="block text-sm text-ink-muted">
          {{ $t('admin.quizzes.fields.difficulty') }}
          <select
            v-model="form.difficulty"
            class="mt-1 block w-full rounded-sm border-0 px-3 py-2 text-sm ring-1 ring-inset ring-hairline focus:outline focus:outline-2 focus:outline-accent-primary"
          >
            <option value="EASY">{{ $t('quiz.difficulty.EASY') }}</option>
            <option value="MEDIUM">{{ $t('quiz.difficulty.MEDIUM') }}</option>
            <option value="HARD">{{ $t('quiz.difficulty.HARD') }}</option>
          </select>
        </label>
        <BaseInput
          v-model="form.timeLimitSeconds"
          type="number"
          :label="$t('admin.quizzes.fields.timeLimitSeconds')"
        />
        <label class="flex items-center gap-2 text-sm text-ink-muted">
          <input v-model="form.speedBonusEnabled" type="checkbox" class="h-4 w-4" />
          {{ $t('admin.quizzes.fields.speedBonusEnabled') }}
        </label>
        <BaseAlert v-if="formError" variant="error" role="alert" aria-live="polite">
          {{ formError }}
        </BaseAlert>
        <BaseAlert v-if="saved" variant="success" role="status" aria-live="polite">
          {{ $t('admin.quizzes.saved') }}
        </BaseAlert>
        <BaseButton type="submit" :disabled="isSaving">{{ $t('admin.quizzes.save') }}</BaseButton>
      </form>

      <div class="mt-8 flex items-center justify-between">
        <h2 class="text-lg font-semibold">{{ $t('admin.quizzes.questionsTitle') }}</h2>
        <BaseButton type="button" @click="showAddQuestion = !showAddQuestion">
          {{ $t('admin.quizzes.addQuestion') }}
        </BaseButton>
      </div>

      <form
        v-if="showAddQuestion"
        class="mt-3 space-y-3 rounded-lg border border-hairline p-4"
        novalidate
        @submit.prevent="onAddQuestion"
      >
        <label class="block text-sm text-ink-muted">
          {{ $t('admin.questions.fields.type') }}
          <select
            v-model="newQuestion.type"
            class="mt-1 block w-full rounded-sm border-0 px-3 py-2 text-sm ring-1 ring-inset ring-hairline focus:outline focus:outline-2 focus:outline-accent-primary"
          >
            <option value="SINGLE_CHOICE">{{ $t('admin.questions.type.SINGLE_CHOICE') }}</option>
            <option value="MULTIPLE_CHOICE">
              {{ $t('admin.questions.type.MULTIPLE_CHOICE') }}
            </option>
            <option value="TRUE_FALSE">{{ $t('admin.questions.type.TRUE_FALSE') }}</option>
            <option value="FREE_TEXT">{{ $t('admin.questions.type.FREE_TEXT') }}</option>
          </select>
        </label>
        <BaseInput
          v-model="newQuestion.statement"
          :label="$t('admin.questions.fields.statement')"
        />
        <BaseInput
          v-model="newQuestion.points"
          type="number"
          :label="$t('admin.questions.fields.points')"
        />
        <BaseAlert v-if="addQuestionError" variant="error" role="alert" aria-live="polite">
          {{ addQuestionError }}
        </BaseAlert>
        <div class="flex gap-2">
          <BaseButton type="submit" :disabled="isCreatingQuestion">{{
            $t('admin.quizzes.save')
          }}</BaseButton>
          <BaseButton type="button" variant="secondary" @click="showAddQuestion = false">
            {{ $t('admin.quizzes.cancel') }}
          </BaseButton>
        </div>
      </form>

      <LoadingSpinner
        v-if="questionsStatus === 'pending'"
        :label="$t('admin.quizzes.loading')"
        class="mt-4"
      />
      <p v-else-if="questionsPage?.items.length === 0" class="mt-4 text-ink-muted">
        {{ $t('admin.quizzes.noQuestions') }}
      </p>
      <ul v-else-if="questionsPage" class="mt-4 space-y-2">
        <li
          v-for="question in questionsPage.items"
          :key="question.id"
          class="flex items-center justify-between gap-4 rounded-lg border p-3"
          :class="{
            'border-error/30 bg-error/10':
              missingSourceIds.includes(question.id) || missingExplanationIds.includes(question.id),
            'border-hairline': !(
              missingSourceIds.includes(question.id) || missingExplanationIds.includes(question.id)
            ),
          }"
        >
          <div>
            <RouterLink
              :to="{ name: 'admin-question-editor', params: { id: question.id } }"
              class="font-medium text-accent-primary hover:underline"
            >
              {{ question.position }}. {{ question.statement }}
            </RouterLink>
            <p class="mt-1 text-xs text-ink-muted">
              {{ $t(`admin.questions.type.${question.type}`) }} · {{ question.points }} pt
              <span v-if="!question.source" class="ml-1 font-medium text-error">
                · {{ $t('admin.questions.missingSource') }}
              </span>
              <span v-if="!question.explanation" class="ml-1 font-medium text-error">
                · {{ $t('admin.questions.missingExplanation') }}
              </span>
            </p>
          </div>
          <BaseButton type="button" variant="danger" @click="onDeleteQuestion(question.id)">
            {{ $t('admin.quizzes.delete') }}
          </BaseButton>
        </li>
      </ul>
    </template>
  </section>
</template>
