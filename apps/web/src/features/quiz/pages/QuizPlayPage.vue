<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref, watch } from 'vue';
import type { SubmitAnswerInput } from '@quiz/shared';

import BaseAlert from '@/components/ui/BaseAlert.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue';
import RouteProgress from '../components/RouteProgress.vue';
import { useQuizQuery } from '../api/quizzes';
import { useQuizSession } from '../composables/useQuizSession';

// features/geo n'entre jamais dans le bundle d'entrée (frontend.md §3) :
// chargé en chunk séparé, seulement quand une question géo apparaît.
const MapQuestion = defineAsyncComponent(
  () => import('@/features/geo/components/MapQuestion.vue'),
);

const props = defineProps<{ slug: string }>();

const session = useQuizSession(props.slug);
const { data: quiz } = useQuizQuery(() => props.slug);

const selectedChoiceIds = ref<string[]>([]);
const freeTextAnswer = ref('');
const mapAnswer = ref<{ featureId: string } | { lat: number; lng: number } | null>(null);

onMounted(() => {
  session.initialize();
});

// Réinitialise le formulaire à chaque nouvelle question.
watch(
  () => session.currentQuestion.value?.id,
  () => {
    selectedChoiceIds.value = [];
    freeTextAnswer.value = '';
    mapAnswer.value = null;
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
  } else if (question.type === 'MAP_CLICK' || question.type === 'MAP_PLACE') {
    if (!mapAnswer.value) return;
    session.answer({ questionId: question.id, ...mapAnswer.value } as SubmitAnswerInput);
  } else {
    session.answer({ questionId: question.id, choiceIds: selectedChoiceIds.value });
  }
}

const canSubmit = () => {
  const question = session.currentQuestion.value;
  if (!question) return false;
  if (question.type === 'FREE_TEXT') return freeTextAnswer.value.trim().length > 0;
  if (question.type === 'MAP_CLICK' || question.type === 'MAP_PLACE') return mapAnswer.value !== null;
  return selectedChoiceIds.value.length > 0;
};
</script>

<template>
  <section class="mx-auto max-w-2xl">
    <div v-if="session.status.value === 'error'" class="space-y-3">
      <BaseAlert variant="error" role="alert">
        {{ session.errorMessage.value ?? $t('quizPlay.error') }}
      </BaseAlert>
      <BaseButton type="button" variant="secondary" @click="session.retry()">
        {{ $t('common.retry') }}
      </BaseButton>
    </div>

    <div v-else-if="session.phase.value === 'loading'">
      <p class="sr-only" role="status">{{ $t('quizPlay.loading') }}</p>
      <div aria-hidden="true">
        <BaseSkeleton class="h-6 w-full max-w-xs" />
        <BaseSkeleton class="mt-6 h-6 w-full" />
        <BaseSkeleton class="mt-2 h-6 w-2/3" />
        <div class="mt-4 space-y-2">
          <BaseSkeleton v-for="n in 4" :key="n" class="h-11 w-full rounded-lg" />
        </div>
      </div>
    </div>

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

          <div
            v-else-if="
              (session.currentQuestion.value.type === 'MAP_CLICK' ||
                session.currentQuestion.value.type === 'MAP_PLACE') &&
              session.currentQuestion.value.payload
            "
            class="mt-4"
          >
            <MapQuestion
              v-model:answer="mapAnswer"
              :type="session.currentQuestion.value.type"
              :payload="session.currentQuestion.value.payload"
            />
          </div>

          <div v-else class="mt-4 space-y-2">
            <label
              v-for="choice in session.currentQuestion.value.choices"
              :key="choice.id"
              class="flex cursor-pointer items-center gap-3 rounded-lg border border-hairline p-3 hover:bg-bg has-[:checked]:border-accent-primary has-[:checked]:bg-accent-primary/5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent-primary"
            >
              <input
                v-if="session.currentQuestion.value.type === 'MULTIPLE_CHOICE'"
                type="checkbox"
                :checked="selectedChoiceIds.includes(choice.id)"
                class="h-4 w-4 accent-accent-primary"
                @change="
                  toggleMultipleChoice(choice.id, ($event.target as HTMLInputElement).checked)
                "
              />
              <input
                v-else
                type="radio"
                name="choice"
                :checked="selectedChoiceIds.includes(choice.id)"
                class="h-4 w-4 accent-accent-primary"
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

    <div v-else-if="session.phase.value === 'finishing'">
      <p class="sr-only" role="status">{{ $t('quizPlay.finishing') }}</p>
      <div aria-hidden="true">
        <BaseSkeleton class="h-6 w-full max-w-xs" />
        <BaseSkeleton class="mt-6 h-24 w-full rounded-lg" />
      </div>
    </div>
  </section>
</template>
