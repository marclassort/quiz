import { z } from 'zod';

import { questionTypeSchema } from '../enums';
import { publicMapClickPayloadSchema, publicMapPlacePayloadSchema } from './geo';

/**
 * Choix envoyé au joueur : jamais de `isCorrect` avant soumission de la
 * réponse (claude.md §6.1).
 */
export const publicChoiceSchema = z.object({
  id: z.uuid(),
  position: z.int(),
  label: z.string(),
});
export type PublicChoice = z.infer<typeof publicChoiceSchema>;

export const publicQuestionSchema = z.object({
  id: z.uuid(),
  position: z.int(),
  type: questionTypeSchema,
  statement: z.string(),
  imageUrl: z.string().nullable(),
  points: z.int(),
  choices: z.array(publicChoiceSchema),
  /**
   * `MAP_CLICK`/`MAP_PLACE` uniquement — jamais `featureIds`, `targetLat`,
   * `targetLng` (claude.md §4 anti-triche, cf. publicMapClickPayloadSchema /
   * publicMapPlacePayloadSchema). Optionnel pour rester compatible avec les
   * questions classiques déjà en place, qui ne le renseignent jamais.
   */
  payload: z
    .union([publicMapClickPayloadSchema, publicMapPlacePayloadSchema])
    .nullable()
    .optional(),
});
export type PublicQuestion = z.infer<typeof publicQuestionSchema>;
