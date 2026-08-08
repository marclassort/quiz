import { useQuery } from '@pinia/colada';
import type { GeoDataset } from '@quiz/shared';

import { apiFetch } from '@/lib/http';

export function useGeoDatasetQuery(slug: () => string) {
  return useQuery({
    key: () => ['geo-datasets', slug()],
    query: () => apiFetch<GeoDataset>(`/geo/datasets/${slug()}`),
  });
}
