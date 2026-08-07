import { useQuery } from '@pinia/colada';
import type { Theme } from '@quiz/shared';

import { apiFetch } from '@/lib/http';

export function useThemesQuery() {
  return useQuery({
    key: ['themes'],
    query: () => apiFetch<Theme[]>('/themes'),
  });
}

export function useThemeQuery(slug: () => string) {
  return useQuery({
    key: () => ['themes', slug()],
    query: () => apiFetch<Theme>(`/themes/${slug()}`),
  });
}
