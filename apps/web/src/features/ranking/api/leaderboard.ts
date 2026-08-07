import { useQuery } from '@pinia/colada';
import type { LeaderboardEntry, LeaderboardScope, MyRankResponse } from '@quiz/shared';

import { apiFetch } from '@/lib/http';
import { useAuthStore } from '@/stores/auth';

interface PaginatedLeaderboard {
  items: LeaderboardEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function useLeaderboardQuery(
  scope: () => LeaderboardScope,
  themeSlug: () => string | undefined,
  page: () => number,
) {
  return useQuery({
    key: () => ['leaderboard', scope(), themeSlug() ?? null, page()],
    // scope=theme exige un themeSlug côté API : on attend qu'il soit choisi
    // (ex. thèmes pas encore chargés) plutôt que d'émettre une requête vouée à échouer.
    enabled: () => scope() !== 'theme' || themeSlug() !== undefined,
    query: () => {
      const params = new URLSearchParams({ scope: scope(), page: String(page()) });
      const slug = themeSlug();
      if (slug) params.set('themeSlug', slug);
      return apiFetch<PaginatedLeaderboard>(`/leaderboard?${params.toString()}`);
    },
  });
}

/** `/me/rank` requiert une session : n'est interrogé que pour un utilisateur connecté. */
export function useMyRankQuery() {
  const authStore = useAuthStore();

  return useQuery({
    key: ['me', 'rank'],
    query: () => apiFetch<MyRankResponse>('/me/rank'),
    enabled: () => authStore.isAuthenticated,
  });
}
