import { useMutation, useQuery, useQueryCache } from '@pinia/colada';
import type {
  AdminQuestionListQuery,
  CreateAcceptedAnswerInput,
  CreateChoiceInput,
  CreateQuestionInput,
  QuestionAuditLogEntry,
  QuestionType,
  QuizStatus,
  ReorderChoicesInput,
  UpdateAcceptedAnswerInput,
  UpdateChoiceInput,
  UpdateQuestionInput,
} from '@quiz/shared';

import { apiFetch } from '@/lib/http';

export interface AdminChoice {
  id: string;
  questionId: string;
  position: number;
  label: string;
  isCorrect: boolean;
}

export interface AdminAcceptedAnswer {
  id: string;
  questionId: string;
  value: string;
  isPrimary: boolean;
  normalizedValue: string;
}

export interface AdminQuestionListItem {
  id: string;
  quizId: string;
  position: number;
  type: QuestionType;
  statement: string;
  imageUrl: string | null;
  points: number;
  explanation: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  quiz: { slug: string; title: string; status: QuizStatus };
  totalAnswers: number;
  correctAnswers: number;
  successRate: number;
}

export interface AdminQuestionDetail extends AdminQuestionListItem {
  choices: AdminChoice[];
  acceptedAnswers: { id: string; questionId: string; value: string; isPrimary: boolean }[];
}

interface PaginatedAdminQuestions {
  items: AdminQuestionListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function toQueryString(query: Partial<AdminQuestionListQuery>): string {
  const params = new URLSearchParams();
  if (query.theme) params.set('theme', query.theme);
  if (query.quizId) params.set('quizId', query.quizId);
  if (query.type) params.set('type', query.type);
  if (query.status) params.set('status', query.status);
  if (query.search) params.set('search', query.search);
  params.set('page', String(query.page ?? 1));
  return params.toString();
}

export function useAdminQuestionsQuery(filters: () => Partial<AdminQuestionListQuery>) {
  return useQuery({
    key: () => ['admin', 'questions', filters()],
    query: () => apiFetch<PaginatedAdminQuestions>(`/admin/questions?${toQueryString(filters())}`),
  });
}

export function useAdminQuestionQuery(id: () => string) {
  return useQuery({
    key: () => ['admin', 'questions', id()],
    query: () => apiFetch<AdminQuestionDetail>(`/admin/questions/${id()}`),
  });
}

// ['admin', 'questions'] est le préfixe commun à la fois de la liste filtrée
// (['admin', 'questions', filters]) et du détail d'une question
// (['admin', 'questions', id]) : l'invalider couvre les deux d'un coup.
function invalidateQuestion(queryCache: ReturnType<typeof useQueryCache>) {
  queryCache.invalidateQueries({ key: ['admin', 'questions'] });
}

export function useCreateQuestionMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: (input: CreateQuestionInput) =>
      apiFetch<AdminQuestionDetail>('/admin/questions', { method: 'POST', body: input }),
    onSuccess() {
      queryCache.invalidateQueries({ key: ['admin', 'questions'] });
    },
  });
}

export function useUpdateQuestionMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: ({ id, input }: { id: string; input: UpdateQuestionInput }) =>
      apiFetch<AdminQuestionDetail>(`/admin/questions/${id}`, { method: 'PATCH', body: input }),
    onSuccess() {
      invalidateQuestion(queryCache);
    },
  });
}

export function useDeleteQuestionMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: (id: string) => apiFetch<void>(`/admin/questions/${id}`, { method: 'DELETE' }),
    onSuccess() {
      queryCache.invalidateQueries({ key: ['admin', 'questions'] });
    },
  });
}

export function useCreateChoiceMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: ({ questionId, input }: { questionId: string; input: CreateChoiceInput }) =>
      apiFetch<AdminChoice>(`/admin/questions/${questionId}/choices`, {
        method: 'POST',
        body: input,
      }),
    onSuccess() {
      invalidateQuestion(queryCache);
    },
  });
}

export function useUpdateChoiceMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: ({
      questionId,
      choiceId,
      input,
    }: {
      questionId: string;
      choiceId: string;
      input: UpdateChoiceInput;
    }) =>
      apiFetch<AdminChoice>(`/admin/questions/${questionId}/choices/${choiceId}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess() {
      invalidateQuestion(queryCache);
    },
  });
}

export function useDeleteChoiceMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: ({ questionId, choiceId }: { questionId: string; choiceId: string }) =>
      apiFetch<void>(`/admin/questions/${questionId}/choices/${choiceId}`, { method: 'DELETE' }),
    onSuccess() {
      invalidateQuestion(queryCache);
    },
  });
}

export function useReorderChoicesMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: ({ questionId, input }: { questionId: string; input: ReorderChoicesInput }) =>
      apiFetch<AdminChoice[]>(`/admin/questions/${questionId}/choices/reorder`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess() {
      invalidateQuestion(queryCache);
    },
  });
}

export function useAdminAcceptedAnswersQuery(questionId: () => string) {
  return useQuery({
    key: () => ['admin', 'questions', questionId(), 'accepted-answers'],
    query: () =>
      apiFetch<AdminAcceptedAnswer[]>(`/admin/questions/${questionId()}/accepted-answers`),
  });
}

function invalidateAcceptedAnswers(
  queryCache: ReturnType<typeof useQueryCache>,
  questionId: string,
) {
  queryCache.invalidateQueries({ key: ['admin', 'questions', questionId, 'accepted-answers'] });
}

export function useCreateAcceptedAnswerMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: ({ questionId, input }: { questionId: string; input: CreateAcceptedAnswerInput }) =>
      apiFetch<AdminAcceptedAnswer>(`/admin/questions/${questionId}/accepted-answers`, {
        method: 'POST',
        body: input,
      }),
    onSuccess(_data, { questionId }) {
      invalidateAcceptedAnswers(queryCache, questionId);
    },
  });
}

export function useUpdateAcceptedAnswerMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: ({
      questionId,
      answerId,
      input,
    }: {
      questionId: string;
      answerId: string;
      input: UpdateAcceptedAnswerInput;
    }) =>
      apiFetch<AdminAcceptedAnswer>(`/admin/questions/${questionId}/accepted-answers/${answerId}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess(_data, { questionId }) {
      invalidateAcceptedAnswers(queryCache, questionId);
    },
  });
}

export function useDeleteAcceptedAnswerMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: ({ questionId, answerId }: { questionId: string; answerId: string }) =>
      apiFetch<void>(`/admin/questions/${questionId}/accepted-answers/${answerId}`, {
        method: 'DELETE',
      }),
    onSuccess(_data, { questionId }) {
      invalidateAcceptedAnswers(queryCache, questionId);
    },
  });
}

export function useAdminAuditLogQuery(questionId: () => string) {
  return useQuery({
    key: () => ['admin', 'questions', questionId(), 'audit-log'],
    query: () => apiFetch<QuestionAuditLogEntry[]>(`/admin/questions/${questionId()}/audit-log`),
  });
}
