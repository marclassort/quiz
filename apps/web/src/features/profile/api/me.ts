import { useMutation, useQuery, useQueryCache } from '@pinia/colada';
import type { Me, MyAttemptSummary, MyStats, UpdateMeInput } from '@quiz/shared';

import { apiFetch } from '@/lib/http';
import { useAuthStore } from '@/stores/auth';

interface PaginatedAttempts {
  items: MyAttemptSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function useMyAttemptsQuery(page: () => number) {
  return useQuery({
    key: () => ['me', 'attempts', page()],
    query: () => apiFetch<PaginatedAttempts>(`/me/attempts?page=${page()}`),
  });
}

export function useMyStatsQuery() {
  return useQuery({
    key: ['me', 'stats'],
    query: () => apiFetch<MyStats>('/me/stats'),
  });
}

export function useUpdateMeMutation() {
  const authStore = useAuthStore();
  const queryCache = useQueryCache();

  return useMutation({
    mutation: (input: UpdateMeInput) => apiFetch<Me>('/me', { method: 'PATCH', body: input }),
    onSuccess(me) {
      authStore.setUser({ id: me.id, displayName: me.displayName, role: me.role });
      queryCache.invalidateQueries({ key: ['me'] });
    },
  });
}

/** Droit à la portabilité (claude.md §11) : export JSON complet de mes données. */
export function exportMe(): Promise<unknown> {
  return apiFetch<unknown>('/me/export');
}

/** Droit à l'effacement (claude.md §11). */
export function useDeleteMeMutation() {
  const authStore = useAuthStore();
  const queryCache = useQueryCache();

  return useMutation({
    mutation: () => apiFetch<void>('/me', { method: 'DELETE' }),
    onSuccess() {
      authStore.setUser(null);
      queryCache.invalidateQueries({ key: ['me'] });
    },
  });
}
