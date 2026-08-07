import type {
  AnswerResult,
  CurrentQuestionResponse,
  FinishResult,
  SubmitAnswerInput,
} from '@quiz/shared';

import { apiFetch } from '@/lib/http';

export function createAttempt(quizSlug: string): Promise<CurrentQuestionResponse> {
  return apiFetch<CurrentQuestionResponse>(`/quizzes/${quizSlug}/attempts`, { method: 'POST' });
}

export function getCurrentQuestion(attemptId: string): Promise<CurrentQuestionResponse> {
  return apiFetch<CurrentQuestionResponse>(`/attempts/${attemptId}/questions/current`);
}

export function submitAnswer(attemptId: string, input: SubmitAnswerInput): Promise<AnswerResult> {
  return apiFetch<AnswerResult>(`/attempts/${attemptId}/answers`, { method: 'POST', body: input });
}

export function finishAttempt(attemptId: string): Promise<FinishResult> {
  return apiFetch<FinishResult>(`/attempts/${attemptId}/finish`, { method: 'POST' });
}
