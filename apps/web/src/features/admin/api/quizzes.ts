import { useMutation, useQuery, useQueryCache } from '@pinia/colada';
import type {
  AdminQuizListQuery,
  CreateQuizInput,
  QuestionType,
  QuizDifficulty,
  QuizImportInput,
  QuizStatus,
  UpdateQuizInput,
} from '@quiz/shared';

import { apiFetch } from '@/lib/http';

export interface AdminQuiz {
  id: string;
  themeId: string;
  slug: string;
  title: string;
  description: string;
  difficulty: QuizDifficulty;
  status: QuizStatus;
  timeLimitSeconds: number | null;
  speedBonusEnabled: boolean;
  questionCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  theme: { slug: string; name: string };
}

interface PaginatedAdminQuizzes {
  items: AdminQuiz[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminQuizPreviewChoice {
  id: string;
  position: number;
  label: string;
  isCorrect: boolean;
}

export interface AdminQuizPreviewAcceptedAnswer {
  id: string;
  value: string;
  isPrimary: boolean;
}

export interface AdminQuizPreviewQuestion {
  id: string;
  position: number;
  type: QuestionType;
  statement: string;
  imageUrl: string | null;
  points: number;
  explanation: string;
  source: string;
  choices: AdminQuizPreviewChoice[];
  acceptedAnswers: AdminQuizPreviewAcceptedAnswer[];
}

export interface AdminQuizPreview extends AdminQuiz {
  questions: AdminQuizPreviewQuestion[];
}

function toQueryString(query: Partial<AdminQuizListQuery>): string {
  const params = new URLSearchParams();
  if (query.theme) params.set('theme', query.theme);
  if (query.status) params.set('status', query.status);
  if (query.difficulty) params.set('difficulty', query.difficulty);
  params.set('page', String(query.page ?? 1));
  return params.toString();
}

export function useAdminQuizzesQuery(filters: () => Partial<AdminQuizListQuery>) {
  return useQuery({
    key: () => ['admin', 'quizzes', filters()],
    query: () => apiFetch<PaginatedAdminQuizzes>(`/admin/quizzes?${toQueryString(filters())}`),
  });
}

export function useAdminQuizQuery(id: () => string) {
  return useQuery({
    key: () => ['admin', 'quizzes', id()],
    query: () => apiFetch<AdminQuiz>(`/admin/quizzes/${id()}`),
  });
}

export function useAdminQuizPreviewQuery(id: () => string) {
  return useQuery({
    key: () => ['admin', 'quizzes', id(), 'preview'],
    query: () => apiFetch<AdminQuizPreview>(`/admin/quizzes/${id()}/preview`),
  });
}

export function exportQuiz(id: string): Promise<QuizImportInput> {
  return apiFetch<QuizImportInput>(`/admin/quizzes/${id}/export`);
}

function invalidateQuizzes(queryCache: ReturnType<typeof useQueryCache>) {
  queryCache.invalidateQueries({ key: ['admin', 'quizzes'] });
}

export function useCreateQuizMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: (input: CreateQuizInput) =>
      apiFetch<AdminQuiz>('/admin/quizzes', { method: 'POST', body: input }),
    onSuccess: () => invalidateQuizzes(queryCache),
  });
}

export function useImportQuizMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: (input: QuizImportInput) =>
      apiFetch<AdminQuiz>('/admin/quizzes/import', { method: 'POST', body: input }),
    onSuccess: () => invalidateQuizzes(queryCache),
  });
}

export function useUpdateQuizMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: ({ id, input }: { id: string; input: UpdateQuizInput }) =>
      apiFetch<AdminQuiz>(`/admin/quizzes/${id}`, { method: 'PATCH', body: input }),
    onSuccess: () => invalidateQuizzes(queryCache),
  });
}

export function useDeleteQuizMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: (id: string) => apiFetch<void>(`/admin/quizzes/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateQuizzes(queryCache),
  });
}

export function usePublishQuizMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: (id: string) =>
      apiFetch<AdminQuiz>(`/admin/quizzes/${id}/publish`, { method: 'POST' }),
    onSuccess: () => invalidateQuizzes(queryCache),
  });
}

export function useUnpublishQuizMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: (id: string) =>
      apiFetch<AdminQuiz>(`/admin/quizzes/${id}/unpublish`, { method: 'POST' }),
    onSuccess: () => invalidateQuizzes(queryCache),
  });
}
