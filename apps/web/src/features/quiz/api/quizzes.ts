import { useQuery } from '@pinia/colada';
import type { QuizDetail, QuizSummary } from '@quiz/shared';

import { apiFetch } from '@/lib/http';

interface PaginatedQuizzes {
  items: QuizSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function useQuizzesQuery(themeSlug: () => string) {
  return useQuery({
    key: () => ['quizzes', { theme: themeSlug() }],
    query: () => apiFetch<PaginatedQuizzes>(`/quizzes?theme=${encodeURIComponent(themeSlug())}`),
  });
}

export function useQuizQuery(slug: () => string) {
  return useQuery({
    key: () => ['quizzes', slug()],
    query: () => apiFetch<QuizDetail>(`/quizzes/${slug()}`),
  });
}
