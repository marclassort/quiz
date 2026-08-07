import { useMutation, useQuery, useQueryCache } from '@pinia/colada';
import type { AnswerReviewListQuery, AnswerReviewStatus } from '@quiz/shared';

import { apiFetch } from '@/lib/http';

export interface AdminAnswerReview {
  id: string;
  questionId: string;
  submittedText: string;
  occurrences: number;
  status: AnswerReviewStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  question: { statement: string; quiz: { slug: string; title: string } };
}

interface PaginatedAnswerReviews {
  items: AdminAnswerReview[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function useAnswerReviewsQuery(filters: () => Partial<AnswerReviewListQuery>) {
  return useQuery({
    key: () => ['admin', 'answer-reviews', filters()],
    query: () => {
      const params = new URLSearchParams();
      if (filters().status) params.set('status', filters().status as string);
      params.set('page', String(filters().page ?? 1));
      return apiFetch<PaginatedAnswerReviews>(`/admin/answer-reviews?${params.toString()}`);
    },
  });
}

function invalidateAnswerReviews(queryCache: ReturnType<typeof useQueryCache>) {
  queryCache.invalidateQueries({ key: ['admin', 'answer-reviews'] });
}

export function useAcceptAnswerReviewMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: (id: string) =>
      apiFetch<AdminAnswerReview>(`/admin/answer-reviews/${id}/accept`, { method: 'POST' }),
    onSuccess: () => invalidateAnswerReviews(queryCache),
  });
}

export function useRejectAnswerReviewMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: (id: string) =>
      apiFetch<AdminAnswerReview>(`/admin/answer-reviews/${id}/reject`, { method: 'POST' }),
    onSuccess: () => invalidateAnswerReviews(queryCache),
  });
}
