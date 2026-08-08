import { z } from 'zod';

import { gameModeSchema, quizDifficultySchema } from '../enums';

export const quizSummarySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  difficulty: quizDifficultySchema,
  gameMode: gameModeSchema,
  questionCount: z.int(),
  timeLimitSeconds: z.int().nullable(),
  themeSlug: z.string(),
});
export type QuizSummary = z.infer<typeof quizSummarySchema>;

export const quizDetailSchema = quizSummarySchema.extend({
  speedBonusEnabled: z.boolean(),
});
export type QuizDetail = z.infer<typeof quizDetailSchema>;

export const quizListQuerySchema = z.object({
  theme: z.string().optional(),
  difficulty: quizDifficultySchema.optional(),
  gameMode: gameModeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
});
export type QuizListQuery = z.infer<typeof quizListQuerySchema>;
