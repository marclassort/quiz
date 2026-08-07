<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { updateQuestionSchema } from '@quiz/shared';
import type { QuestionType } from '@quiz/shared';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import { ApiError } from '@/lib/http';
import {
  useAdminAcceptedAnswersQuery,
  useAdminAuditLogQuery,
  useAdminQuestionQuery,
  useCreateAcceptedAnswerMutation,
  useCreateChoiceMutation,
  useDeleteAcceptedAnswerMutation,
  useDeleteChoiceMutation,
  useReorderChoicesMutation,
  useUpdateAcceptedAnswerMutation,
  useUpdateChoiceMutation,
  useUpdateQuestionMutation,
} from '../api/questions';

const props = defineProps<{ id: string }>();
const { t } = useI18n();

const {
  data: question,
  status: questionStatus,
  error: questionError,
} = useAdminQuestionQuery(() => props.id);
const { data: auditLog } = useAdminAuditLogQuery(() => props.id);
const isFreeText = computed(() => question.value?.type === 'FREE_TEXT');
const { data: acceptedAnswers, status: acceptedAnswersStatus } = useAdminAcceptedAnswersQuery(
  () => props.id,
);

const { mutateAsync: updateQuestion, isLoading: isSaving } = useUpdateQuestionMutation();

const form = ref({
  type: 'SINGLE_CHOICE' as QuestionType,
  statement: '',
  points: 1,
  explanation: '',
  source: '',
});
const formError = ref<string | null>(null);
const saved = ref(false);

watchEffect(() => {
  if (question.value) {
    form.value = {
      type: question.value.type,
      statement: question.value.statement,
      points: question.value.points,
      explanation: question.value.explanation,
      source: question.value.source,
    };
  }
});

async function onSaveQuestion() {
  formError.value = null;
  saved.value = false;
  const parsed = updateQuestionSchema.safeParse(form.value);
  if (!parsed.success) {
    formError.value = parsed.error.issues[0]?.message ?? t('admin.questions.invalidForm');
    return;
  }
  try {
    await updateQuestion({ id: props.id, input: parsed.data });
    saved.value = true;
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : t('common.genericError');
  }
}

// --- Choix (SINGLE_CHOICE / MULTIPLE_CHOICE / TRUE_FALSE) ---

const { mutateAsync: createChoice, isLoading: isCreatingChoice } = useCreateChoiceMutation();
const { mutateAsync: updateChoice } = useUpdateChoiceMutation();
const { mutateAsync: deleteChoiceMutation } = useDeleteChoiceMutation();
const { mutateAsync: reorderChoices } = useReorderChoicesMutation();

const newChoice = ref({ label: '', isCorrect: false });
const choiceError = ref<string | null>(null);

async function onAddChoice() {
  choiceError.value = null;
  if (!newChoice.value.label.trim()) return;
  const nextPosition = (question.value?.choices.length ?? 0) + 1;
  try {
    await createChoice({
      questionId: props.id,
      input: {
        position: nextPosition,
        label: newChoice.value.label,
        isCorrect: newChoice.value.isCorrect,
      },
    });
    newChoice.value = { label: '', isCorrect: false };
  } catch (err) {
    choiceError.value = err instanceof ApiError ? err.message : t('common.genericError');
  }
}

async function onToggleChoiceCorrect(choiceId: string, isCorrect: boolean) {
  choiceError.value = null;
  try {
    await updateChoice({ questionId: props.id, choiceId, input: { isCorrect } });
  } catch (err) {
    choiceError.value = err instanceof ApiError ? err.message : t('common.genericError');
  }
}

async function onRenameChoice(choiceId: string, label: string) {
  choiceError.value = null;
  try {
    await updateChoice({ questionId: props.id, choiceId, input: { label } });
  } catch (err) {
    choiceError.value = err instanceof ApiError ? err.message : t('common.genericError');
  }
}

async function onDeleteChoice(choiceId: string) {
  choiceError.value = null;
  try {
    await deleteChoiceMutation({ questionId: props.id, choiceId });
  } catch (err) {
    choiceError.value = err instanceof ApiError ? err.message : t('common.genericError');
  }
}

async function onMoveChoice(index: number, direction: -1 | 1) {
  const choices = question.value?.choices;
  if (!choices) return;
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= choices.length) return;

  const orderedIds = choices.map((c) => c.id);
  // Bornes déjà validées ci-dessus (targetIndex dans [0, length[) : l'accès
  // indexé est sûr malgré `noUncheckedIndexedAccess`.
  const current = orderedIds[index]!;
  orderedIds[index] = orderedIds[targetIndex]!;
  orderedIds[targetIndex] = current;

  choiceError.value = null;
  try {
    await reorderChoices({ questionId: props.id, input: { orderedChoiceIds: orderedIds } });
  } catch (err) {
    choiceError.value = err instanceof ApiError ? err.message : t('common.genericError');
  }
}

// --- Réponses acceptées (FREE_TEXT) ---

const { mutateAsync: createAcceptedAnswer, isLoading: isCreatingAnswer } =
  useCreateAcceptedAnswerMutation();
const { mutateAsync: updateAcceptedAnswer } = useUpdateAcceptedAnswerMutation();
const { mutateAsync: deleteAcceptedAnswerMutation } = useDeleteAcceptedAnswerMutation();

const newAnswer = ref({ value: '', isPrimary: false });
const answerError = ref<string | null>(null);

async function onAddAcceptedAnswer() {
  answerError.value = null;
  if (!newAnswer.value.value.trim()) return;
  try {
    await createAcceptedAnswer({
      questionId: props.id,
      input: { value: newAnswer.value.value, isPrimary: newAnswer.value.isPrimary },
    });
    newAnswer.value = { value: '', isPrimary: false };
  } catch (err) {
    answerError.value = err instanceof ApiError ? err.message : t('common.genericError');
  }
}

async function onTogglePrimary(answerId: string, isPrimary: boolean) {
  answerError.value = null;
  try {
    await updateAcceptedAnswer({ questionId: props.id, answerId, input: { isPrimary } });
  } catch (err) {
    answerError.value = err instanceof ApiError ? err.message : t('common.genericError');
  }
}

async function onDeleteAcceptedAnswer(answerId: string) {
  answerError.value = null;
  try {
    await deleteAcceptedAnswerMutation({ questionId: props.id, answerId });
  } catch (err) {
    answerError.value = err instanceof ApiError ? err.message : t('common.genericError');
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}
</script>

<template>
  <section class="mx-auto max-w-2xl">
    <LoadingSpinner v-if="questionStatus === 'pending'" :label="$t('admin.questions.loading')" />
    <BaseAlert v-else-if="questionStatus === 'error'" variant="error" role="alert">
      {{ questionError?.message ?? $t('admin.questions.loadError') }}
    </BaseAlert>

    <template v-else-if="question">
      <h1 class="font-display text-2xl font-bold">{{ $t('admin.questions.editTitle') }}</h1>
      <p class="mt-1 text-sm text-ink-muted">
        {{ question.quiz.title }} ·
        {{ $t('admin.questions.successRate', { rate: Math.round(question.successRate * 100) }) }}
        ({{ question.correctAnswers }}/{{ question.totalAnswers }})
      </p>

      <form
        class="mt-6 space-y-3 rounded-lg border border-hairline p-4"
        novalidate
        @submit.prevent="onSaveQuestion"
      >
        <label class="block text-sm text-ink-muted">
          {{ $t('admin.questions.fields.type') }}
          <select
            v-model="form.type"
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
        <BaseInput v-model="form.statement" :label="$t('admin.questions.fields.statement')" />
        <BaseInput
          v-model="form.points"
          type="number"
          :label="$t('admin.questions.fields.points')"
        />
        <BaseInput v-model="form.explanation" :label="$t('admin.questions.fields.explanation')" />
        <BaseInput v-model="form.source" :label="$t('admin.questions.fields.source')" />
        <BaseAlert v-if="formError" variant="error" role="alert" aria-live="polite">
          {{ formError }}
        </BaseAlert>
        <BaseAlert v-if="saved" variant="success" role="status" aria-live="polite">
          {{ $t('admin.questions.saved') }}
        </BaseAlert>
        <BaseButton type="submit" :disabled="isSaving">{{ $t('admin.questions.save') }}</BaseButton>
      </form>

      <template v-if="!isFreeText">
        <h2 class="mt-8 text-lg font-semibold">{{ $t('admin.questions.choicesTitle') }}</h2>
        <BaseAlert v-if="choiceError" variant="error" role="alert" class="mt-2">
          {{ choiceError }}
        </BaseAlert>
        <ul class="mt-2 space-y-2">
          <li
            v-for="(choice, index) in question.choices"
            :key="choice.id"
            class="flex items-center gap-2 rounded-lg border border-hairline p-3"
          >
            <label class="flex flex-1 items-center gap-2 text-sm">
              <input
                type="checkbox"
                :checked="choice.isCorrect"
                class="h-4 w-4"
                @change="
                  onToggleChoiceCorrect(choice.id, ($event.target as HTMLInputElement).checked)
                "
              />
              <input
                :value="choice.label"
                class="flex-1 rounded-sm border-0 px-2 py-1 text-sm ring-1 ring-inset ring-hairline"
                @change="onRenameChoice(choice.id, ($event.target as HTMLInputElement).value)"
              />
            </label>
            <div class="flex flex-none gap-1">
              <BaseButton
                type="button"
                variant="secondary"
                :disabled="index === 0"
                @click="onMoveChoice(index, -1)"
              >
                ↑
              </BaseButton>
              <BaseButton
                type="button"
                variant="secondary"
                :disabled="index === question.choices.length - 1"
                @click="onMoveChoice(index, 1)"
              >
                ↓
              </BaseButton>
              <BaseButton type="button" variant="danger" @click="onDeleteChoice(choice.id)">
                {{ $t('admin.quizzes.delete') }}
              </BaseButton>
            </div>
          </li>
        </ul>

        <form class="mt-3 flex flex-wrap items-end gap-2" novalidate @submit.prevent="onAddChoice">
          <BaseInput
            v-model="newChoice.label"
            :label="$t('admin.questions.fields.newChoiceLabel')"
          />
          <label class="flex items-center gap-2 pb-2 text-sm text-ink-muted">
            <input v-model="newChoice.isCorrect" type="checkbox" class="h-4 w-4" />
            {{ $t('admin.questions.fields.isCorrect') }}
          </label>
          <BaseButton type="submit" :disabled="isCreatingChoice">
            {{ $t('admin.questions.addChoice') }}
          </BaseButton>
        </form>
      </template>

      <template v-else>
        <h2 class="mt-8 text-lg font-semibold">{{ $t('admin.questions.acceptedAnswersTitle') }}</h2>
        <BaseAlert v-if="answerError" variant="error" role="alert" class="mt-2">
          {{ answerError }}
        </BaseAlert>
        <LoadingSpinner
          v-if="acceptedAnswersStatus === 'pending'"
          :label="$t('admin.questions.loading')"
          class="mt-2"
        />
        <ul v-else-if="acceptedAnswers" class="mt-2 space-y-2">
          <li
            v-for="answer in acceptedAnswers"
            :key="answer.id"
            class="flex items-center gap-3 rounded-lg border border-hairline p-3 text-sm"
          >
            <div class="flex-1">
              <p class="font-medium">{{ answer.value }}</p>
              <p class="text-xs text-ink-muted">
                {{ $t('admin.questions.normalizedPreview') }} :
                <code class="rounded bg-surface px-1">{{ answer.normalizedValue }}</code>
              </p>
            </div>
            <label class="flex items-center gap-1 text-xs text-ink-muted">
              <input
                type="checkbox"
                :checked="answer.isPrimary"
                class="h-4 w-4"
                @change="onTogglePrimary(answer.id, ($event.target as HTMLInputElement).checked)"
              />
              {{ $t('admin.questions.fields.isPrimary') }}
            </label>
            <BaseButton type="button" variant="danger" @click="onDeleteAcceptedAnswer(answer.id)">
              {{ $t('admin.quizzes.delete') }}
            </BaseButton>
          </li>
        </ul>

        <form
          class="mt-3 flex flex-wrap items-end gap-2"
          novalidate
          @submit.prevent="onAddAcceptedAnswer"
        >
          <BaseInput
            v-model="newAnswer.value"
            :label="$t('admin.questions.fields.newAnswerValue')"
          />
          <label class="flex items-center gap-2 pb-2 text-sm text-ink-muted">
            <input v-model="newAnswer.isPrimary" type="checkbox" class="h-4 w-4" />
            {{ $t('admin.questions.fields.isPrimary') }}
          </label>
          <BaseButton type="submit" :disabled="isCreatingAnswer">
            {{ $t('admin.questions.addAcceptedAnswer') }}
          </BaseButton>
        </form>
      </template>

      <h2 class="mt-8 text-lg font-semibold">{{ $t('admin.questions.auditLogTitle') }}</h2>
      <p v-if="!auditLog || auditLog.length === 0" class="mt-2 text-sm text-ink-muted">
        {{ $t('admin.questions.noAuditLog') }}
      </p>
      <ul v-else class="mt-2 space-y-1 text-sm text-ink-muted">
        <li v-for="entry in auditLog" :key="entry.id">
          {{ formatDate(entry.changedAt) }} —
          {{ $t(`admin.questions.auditAction.${entry.action}`) }}
          {{ $t('admin.questions.auditBy') }}
          {{ entry.changedByDisplayName ?? $t('admin.questions.unknownAdmin') }}
        </li>
      </ul>
    </template>
  </section>
</template>
