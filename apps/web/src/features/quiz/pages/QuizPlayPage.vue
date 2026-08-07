<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';
import RouteProgress from '../components/RouteProgress.vue';
import { useQuizQuery } from '../api/quizzes';
import { useQuizSession } from '../composables/useQuizSession';

const props = defineProps<{ slug: string }>();

const session = useQuizSession(props.slug);
const { data: quiz } = useQuizQuery(() => props.slug);

const selectedChoiceIds = ref<string[]>([]);
const freeTextAnswer = ref('');

onMounted(() => {
  session.initialize();
});

// Réinitialise le formulaire à chaque nouvelle question.
watch(
  () => session.currentQuestion.value?.id,
  () => {
    selectedChoiceIds.value = [];
    freeTextAnswer.value = '';
  },
);

function toggleSingleChoice(choiceId: string) {
  selectedChoiceIds.value = [choiceId];
}

function toggleMultipleChoice(choiceId: string, checked: boolean) {
  selectedChoiceIds.value = checked
    ? [...selectedChoiceIds.value, choiceId]
    : selectedChoiceIds.value.filter((id) => id !== choiceId);
}

function onSubmit() {
  const question = session.currentQuestion.value;
  if (!question) return;

  if (question.type === 'FREE_TEXT') {
    session.answer({ questionId: question.id, text: freeTextAnswer.value });
  } else {
    session.answer({ questionId: question.id, choiceIds: selectedChoiceIds.value });
  }
}

const canSubmit = () => {
  const question = session.currentQuestion.value;
  if (!question) return false;
  return question.type === 'FREE_TEXT'
    ? freeTextAnswer.value.trim().length > 0
    : selectedChoiceIds.value.length > 0;
};
</script>

<template>
  <section class="mx-auto max-w-2xl">
    <LoadingSpinner v-if="session.phase.value === 'loading'" :label="$t('quizPlay.loading')" />

    <BaseAlert v-else-if="session.status.value === 'error'" variant="error" role="alert">
      {{ session.errorMessage.value ?? $t('quizPlay.error') }}
    </BaseAlert>

    <template v-else-if="session.phase.value === 'playing' && session.currentQuestion.value">
      <RouteProgress
        v-if="quiz"
        :current="session.currentQuestion.value.position"
        :total="quiz.questionCount"
        class="mb-6"
      />

      <form novalidate @submit.prevent="onSubmit">
        <fieldset>
          <legend class="text-xl font-semibold">
            {{ session.currentQuestion.value.statement }}
          </legend>

          <img
            v-if="session.currentQuestion.value.imageUrl"
            :src="session.currentQuestion.value.imageUrl"
            alt=""
            class="mt-4 max-h-64 rounded-lg"
          />

          <div v-if="session.currentQuestion.value.type === 'FREE_TEXT'" class="mt-4">
            <BaseInput
              v-model="freeTextAnswer"
              :label="$t('quizPlay.answerLabel')"
              autocomplete="off"
              :maxlength="100"
            />
          </div>

          <div v-else class="mt-4 space-y-2">
            <label
              v-for="choice in session.currentQuestion.value.choices"
              :key="choice.id"
              class="flex cursor-pointer items-center gap-3 rounded-lg border border-hairline p-3 hover:bg-bg has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent-primary"
            >
              <input
                v-if="session.currentQuestion.value.type === 'MULTIPLE_CHOICE'"
                type="checkbox"
                :checked="selectedChoiceIds.includes(choice.id)"
                class="h-4 w-4"
                @change="
                  toggleMultipleChoice(choice.id, ($event.target as HTMLInputElement).checked)
                "
              />
              <input
                v-else
                type="radio"
                name="choice"
                :checked="selectedChoiceIds.includes(choice.id)"
                class="h-4 w-4"
                @change="toggleSingleChoice(choice.id)"
              />
              <span>{{ choice.label }}</span>
            </label>
          </div>
        </fieldset>

        <BaseButton
          type="submit"
          class="mt-6"
          :disabled="!canSubmit() || session.status.value === 'pending'"
        >
          {{
            session.status.value === 'pending' ? $t('quizPlay.submitting') : $t('quizPlay.submit')
          }}
        </BaseButton>
      </form>
    </template>

    <template v-else-if="session.phase.value === 'feedback' && session.lastResult.value">
      <RouteProgress
        v-if="quiz && session.currentQuestion.value"
        :current="session.currentQuestion.value.position"
        :total="quiz.questionCount"
        class="mb-6"
      />

      <BaseAlert
        :variant="session.lastResult.value.isCorrect ? 'success' : 'error'"
        role="status"
        aria-live="polite"
      >
        <p class="font-semibold">
          {{
            session.lastResult.value.isCorrect ? $t('quizPlay.correct') : $t('quizPlay.incorrect')
          }}
          <span v-if="session.lastResult.value.pointsEarned > 0">
            {{
              $t(
                'quizPlay.pointsEarned',
                { points: session.lastResult.value.pointsEarned },
                session.lastResult.value.pointsEarned,
              )
            }}
          </span>
        </p>
        <p v-if="!session.lastResult.value.isCorrect" class="mt-1">
          {{ $t('quizPlay.expectedAnswer') }}
          <strong>
            {{
              Array.isArray(session.lastResult.value.correctAnswer)
                ? session.lastResult.value.correctAnswer.join(', ')
                : session.lastResult.value.correctAnswer
            }}
          </strong>
        </p>
        <p class="mt-1">{{ session.lastResult.value.explanation }}</p>
      </BaseAlert>

      <BaseButton class="mt-4" @click="session.continueToNext()">{{
        $t('quizPlay.continue')
      }}</BaseButton>
    </template>

    <LoadingSpinner
      v-else-if="session.phase.value === 'finishing'"
      :label="$t('quizPlay.finishing')"
    />
  </section>
</template>
