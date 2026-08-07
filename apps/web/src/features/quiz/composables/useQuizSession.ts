import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { AnswerResult, PublicQuestion, SubmitAnswerInput } from '@quiz/shared';

import { ApiError } from '@/lib/http';
import {
  createAttempt,
  finishAttempt,
  getCurrentQuestion,
  submitAnswer as submitAnswerApi,
} from '../api/attempts';

type SessionStatus = 'pending' | 'error' | 'success';
type SessionPhase = 'loading' | 'playing' | 'feedback' | 'finishing' | 'completed';

function storageKey(quizSlug: string): string {
  return `quiz-attempt:${quizSlug}`;
}

/**
 * Encapsule le déroulé d'une partie (claude.md §8) : création ou reprise de
 * l'Attempt, question courante, soumission, transition, fin de partie. Les
 * composants qui l'utilisent restent déclaratifs (ils lisent l'état, appellent
 * les actions, ne connaissent pas le détail des appels réseau).
 *
 * Reprise sur rechargement : la route `/quiz/:slug/play` ne porte pas
 * l'attemptId dans l'URL (claude.md §8 ne le prévoit pas), donc l'identifiant
 * est retenu côté client dans `sessionStorage` — seulement comme pointeur.
 * L'état affiché est systématiquement re-demandé au serveur à l'initialisation
 * (l'état de vérité reste côté serveur, cf. §8).
 */
export function useQuizSession(quizSlug: string) {
  const router = useRouter();
  const { t } = useI18n();

  const status = ref<SessionStatus>('pending');
  const phase = ref<SessionPhase>('loading');
  const attemptId = ref<string | null>(null);
  const currentQuestion = ref<PublicQuestion | null>(null);
  const lastResult = ref<AnswerResult | null>(null);
  const errorMessage = ref<string | null>(null);

  function persistAttemptId(id: string) {
    sessionStorage.setItem(storageKey(quizSlug), id);
  }

  function clearPersistedAttemptId() {
    sessionStorage.removeItem(storageKey(quizSlug));
  }

  async function initialize(): Promise<void> {
    status.value = 'pending';
    phase.value = 'loading';
    errorMessage.value = null;

    const storedAttemptId = sessionStorage.getItem(storageKey(quizSlug));

    try {
      if (storedAttemptId) {
        try {
          const response = await getCurrentQuestion(storedAttemptId);
          applyQuestionResponse(storedAttemptId, response);
          status.value = 'success';
          return;
        } catch {
          // Attempt introuvable/plus valide côté serveur (autre appareil,
          // partie déjà terminée ailleurs...) : on repart sur une nouvelle partie.
          clearPersistedAttemptId();
        }
      }

      const response = await createAttempt(quizSlug);
      applyQuestionResponse(response.attemptId, response);
      status.value = 'success';
    } catch (error) {
      status.value = 'error';
      errorMessage.value = error instanceof ApiError ? error.message : t('quizPlay.errors.start');
    }
  }

  function applyQuestionResponse(
    id: string,
    response: { question: PublicQuestion | null; completed: boolean },
  ) {
    attemptId.value = id;
    persistAttemptId(id);
    currentQuestion.value = response.question;
    phase.value = response.completed ? 'finishing' : 'playing';
  }

  async function answer(input: SubmitAnswerInput): Promise<void> {
    if (!attemptId.value) return;

    status.value = 'pending';
    errorMessage.value = null;

    try {
      const result = await submitAnswerApi(attemptId.value, input);
      lastResult.value = result;
      phase.value = 'feedback';
      status.value = 'success';
    } catch (error) {
      status.value = 'error';
      errorMessage.value = error instanceof ApiError ? error.message : t('quizPlay.errors.answer');
    }
  }

  async function continueToNext(): Promise<void> {
    if (!attemptId.value) return;

    lastResult.value = null;
    status.value = 'pending';
    phase.value = 'loading';

    try {
      const response = await getCurrentQuestion(attemptId.value);
      applyQuestionResponse(attemptId.value, response);
      status.value = 'success';

      if (response.completed) {
        // Plus de question : on termine la partie automatiquement, la page
        // reste déclarative (elle n'a pas à surveiller cette transition).
        await finish();
      }
    } catch (error) {
      status.value = 'error';
      errorMessage.value = error instanceof ApiError ? error.message : t('quizPlay.errors.next');
    }
  }

  async function finish(): Promise<void> {
    if (!attemptId.value) return;

    status.value = 'pending';
    phase.value = 'finishing';

    try {
      await finishAttempt(attemptId.value);
      clearPersistedAttemptId();
      status.value = 'success';
      phase.value = 'completed';
      await router.push({
        name: 'quiz-result',
        params: { slug: quizSlug, attemptId: attemptId.value },
      });
    } catch (error) {
      status.value = 'error';
      errorMessage.value = error instanceof ApiError ? error.message : t('quizPlay.errors.finish');
    }
  }

  return {
    status,
    phase,
    attemptId,
    currentQuestion,
    lastResult,
    errorMessage,
    initialize,
    answer,
    continueToNext,
    finish,
  };
}
