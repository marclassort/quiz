import { z } from 'zod';

import { quizDifficultySchema, quizStatusSchema } from '../enums';

export const createQuizSchema = z.object({
  themeSlug: z.string().min(1),
  slug: z.string().min(1).max(150),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  difficulty: quizDifficultySchema,
  timeLimitSeconds: z.int().positive().nullable().optional(),
  speedBonusEnabled: z.boolean().optional(),
});
export type CreateQuizInput = z.infer<typeof createQuizSchema>;

export const updateQuizSchema = createQuizSchema.partial();
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;

export const adminQuizListQuerySchema = z.object({
  theme: z.string().optional(),
  status: quizStatusSchema.optional(),
  difficulty: quizDifficultySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
});
export type AdminQuizListQuery = z.infer<typeof adminQuizListQuerySchema>;
