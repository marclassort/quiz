import { z } from 'zod';

import { geoDatasetKindSchema } from '../enums';

export const createGeoDatasetSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  kind: geoDatasetKindSchema,
  scope: z.string().min(1),
  sourceName: z.string().min(1),
  sourceUrl: z.string().min(1),
  license: z.string().min(1),
  attributionText: z.string().min(1),
  version: z.string().min(1),
});
export type CreateGeoDatasetInput = z.infer<typeof createGeoDatasetSchema>;

/**
 * `PUT /admin/questions/:id/payload` (data-and-api.md §4) : `datasetVersion`
 * n'est pas fourni par l'admin — le serveur le dérive de la version actuelle
 * du `GeoDataset` référencé par `datasetId` au moment de l'enregistrement,
 * pour éviter qu'une valeur saisie à la main dérive de la réalité.
 */
export const updateQuestionPayloadSchema = z.object({
  payload: z.record(z.string(), z.unknown()),
});
export type UpdateQuestionPayloadInput = z.infer<typeof updateQuestionPayloadSchema>;
