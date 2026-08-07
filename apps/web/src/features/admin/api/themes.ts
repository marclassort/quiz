import { useMutation, useQuery, useQueryCache } from '@pinia/colada';
import type { CreateThemeInput, UpdateThemeInput } from '@quiz/shared';

import { apiFetch } from '@/lib/http';

export interface AdminTheme {
  id: string;
  slug: string;
  name: string;
  description: string;
  position: number;
}

export function useAdminThemesQuery() {
  return useQuery({
    key: ['admin', 'themes'],
    query: () => apiFetch<AdminTheme[]>('/admin/themes'),
  });
}

export function useAdminThemeQuery(id: () => string) {
  return useQuery({
    key: () => ['admin', 'themes', id()],
    query: () => apiFetch<AdminTheme>(`/admin/themes/${id()}`),
  });
}

export function useCreateThemeMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: (input: CreateThemeInput) =>
      apiFetch<AdminTheme>('/admin/themes', { method: 'POST', body: input }),
    onSuccess() {
      queryCache.invalidateQueries({ key: ['admin', 'themes'] });
    },
  });
}

export function useUpdateThemeMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: ({ id, input }: { id: string; input: UpdateThemeInput }) =>
      apiFetch<AdminTheme>(`/admin/themes/${id}`, { method: 'PATCH', body: input }),
    onSuccess() {
      queryCache.invalidateQueries({ key: ['admin', 'themes'] });
    },
  });
}

export function useDeleteThemeMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: (id: string) => apiFetch<void>(`/admin/themes/${id}`, { method: 'DELETE' }),
    onSuccess() {
      queryCache.invalidateQueries({ key: ['admin', 'themes'] });
    },
  });
}
