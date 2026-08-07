import { useQuery } from '@pinia/colada';
import type { AdminStats } from '@quiz/shared';

import { apiFetch } from '@/lib/http';

export function useAdminStatsQuery() {
  return useQuery({
    key: ['admin', 'stats'],
    query: () => apiFetch<AdminStats>('/admin/stats'),
  });
}
