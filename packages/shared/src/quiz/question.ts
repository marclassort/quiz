import { z } from 'zod';

import { questionTypeSchema } from '../enums';

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
});
export type PublicQuestion = z.infer<typeof publicQuestionSchema>;
