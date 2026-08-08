import { z } from 'zod';

import { geoDatasetKindSchema } from '../enums';

export const geoDatasetSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  kind: geoDatasetKindSchema,
  scope: z.string(),
  sourceName: z.string(),
  sourceUrl: z.string(),
  license: z.string(),
  attributionText: z.string(),
  version: z.string(),
  updatedAt: z.string(),
});
export type GeoDataset = z.infer<typeof geoDatasetSchema>;

/**
 * Une seule politique pour l'instant (lot 3, étape 3) : tout le dataset est
 * cliquable, les distracteurs sont toutes les autres features. Enum plutôt
 * que littéral unique pour rester extensible sans casser le schéma si un
 * sous-ensemble de candidats est introduit plus tard.
 */
export const distractorPolicySchema = z.enum(['ALL_FEATURES']);
export type DistractorPolicy = z.infer<typeof distractorPolicySchema>;

/**
 * Une seule courbe pour l'instant : décroissance linéaire, points pleins à
 * 0 km jusqu'à 0 point à `toleranceKm`. Formule exacte et cas limites
 * (distance nulle, antiméridien, pôles...) précisés et testés à l'étape 4,
 * documentés dans docs/SCORING.md (game-rules.md §5) — pas figés ici.
 */
export const scoringCurveSchema = z.enum(['LINEAR']);
export type ScoringCurve = z.infer<typeof scoringCurveSchema>;

// --- Payload complet (admin, jamais renvoyé au client avant soumission) ---

export const mapClickPayloadSchema = z.object({
  datasetId: z.uuid(),
  datasetVersion: z.string(),
  featureIds: z.array(z.string()).min(1),
  prompt: z.string().min(1),
  distractorPolicy: distractorPolicySchema,
});
export type MapClickPayload = z.infer<typeof mapClickPayloadSchema>;

export const mapPlacePayloadSchema = z.object({
  datasetId: z.uuid(),
  datasetVersion: z.string(),
  targetLat: z.number().min(-90).max(90),
  targetLng: z.number().min(-180).max(180),
  toleranceKm: z.number().positive(),
  scoringCurve: scoringCurveSchema,
});
export type MapPlacePayload = z.infer<typeof mapPlacePayloadSchema>;

// Entrée admin (sans datasetVersion, dérivé serveur — voir admin/geo-dataset.ts)

export const mapClickPayloadInputSchema = mapClickPayloadSchema.omit({ datasetVersion: true });
export type MapClickPayloadInput = z.infer<typeof mapClickPayloadInputSchema>;

export const mapPlacePayloadInputSchema = mapPlacePayloadSchema.omit({ datasetVersion: true });
export type MapPlacePayloadInput = z.infer<typeof mapPlacePayloadInputSchema>;

export const geoQuestionPayloadSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('MAP_CLICK'), payload: mapClickPayloadSchema }),
  z.object({ type: z.literal('MAP_PLACE'), payload: mapPlacePayloadSchema }),
]);
export type GeoQuestionPayload = z.infer<typeof geoQuestionPayloadSchema>;

// --- Payload public (avant soumission) : jamais featureIds, targetLat, ---
// --- targetLng (claude.md §4 anti-triche). Dérivé par .pick() plutôt que ---
// --- redéfini à la main : un champ sensible ajouté au payload admin plus ---
// --- tard doit être explicitement repris ici pour être exposé, jamais ---
// --- par défaut. `datasetSlug` remplace `datasetId` (dérivé serveur depuis ---
// --- le GeoDataset référencé) : c'est ce dont le client a besoin pour ---
// --- construire l'URL du TopoJSON statique, pas l'id interne. ---

export const publicMapClickPayloadSchema = mapClickPayloadSchema
  .pick({
    datasetVersion: true,
    prompt: true,
    distractorPolicy: true,
  })
  .extend({ datasetSlug: z.string() });
export type PublicMapClickPayload = z.infer<typeof publicMapClickPayloadSchema>;

export const publicMapPlacePayloadSchema = mapPlacePayloadSchema
  .pick({
    datasetVersion: true,
    toleranceKm: true,
    scoringCurve: true,
  })
  .extend({ datasetSlug: z.string() });
export type PublicMapPlacePayload = z.infer<typeof publicMapPlacePayloadSchema>;

export const publicGeoQuestionPayloadSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('MAP_CLICK'), payload: publicMapClickPayloadSchema }),
  z.object({ type: z.literal('MAP_PLACE'), payload: publicMapPlacePayloadSchema }),
]);
export type PublicGeoQuestionPayload = z.infer<typeof publicGeoQuestionPayloadSchema>;
