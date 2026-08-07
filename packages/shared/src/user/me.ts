import { z } from 'zod';

import { displayNameSchema } from '../auth/schemas';
import { userRoleSchema } from '../enums';

export const meSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string(),
  role: userRoleSchema,
  emailVerifiedAt: z.string().nullable(),
  excludedFromLeaderboard: z.boolean(),
  createdAt: z.string(),
});
export type Me = z.infer<typeof meSchema>;

export const updateMeSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    excludedFromLeaderboard: z.boolean().optional(),
  })
  .refine(
    (value) => value.displayName !== undefined || value.excludedFromLeaderboard !== undefined,
    {
      message: 'Fournissez au moins un champ à mettre à jour.',
    },
  );
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

export const myAttemptSummarySchema = z.object({
  id: z.uuid(),
  quizSlug: z.string(),
  quizTitle: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  score: z.int(),
  maxScore: z.int(),
  countsForRanking: z.boolean(),
});
export type MyAttemptSummary = z.infer<typeof myAttemptSummarySchema>;

export const myStatsSchema = z.object({
  totalScore: z.int(),
  quizzesCompleted: z.int(),
  correctAnswers: z.int(),
  totalAnswers: z.int(),
  averageAccuracy: z.number(),
  lastPlayedAt: z.string().nullable(),
});
export type MyStats = z.infer<typeof myStatsSchema>;
