import { z } from 'zod';

export const leaderboardScopeSchema = z.enum(['global', 'theme', '30d']);
export type LeaderboardScope = z.infer<typeof leaderboardScopeSchema>;

export const leaderboardQuerySchema = z
  .object({
    scope: leaderboardScopeSchema.default('global'),
    themeSlug: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
  })
  .refine((value) => value.scope !== 'theme' || value.themeSlug !== undefined, {
    message: 'themeSlug est requis pour scope=theme',
    path: ['themeSlug'],
  });
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;

export const leaderboardEntrySchema = z.object({
  rank: z.int(),
  userId: z.uuid(),
  displayName: z.string(),
  totalScore: z.int(),
  averageAccuracy: z.number(),
  quizzesCompleted: z.int(),
});
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;

export const myRankResponseSchema = z.object({
  rank: z.int().nullable(),
  totalEligible: z.int(),
  reason: z.enum(['not-eligible', 'opted-out']).nullable(),
  entries: z.array(leaderboardEntrySchema),
});
export type MyRankResponse = z.infer<typeof myRankResponseSchema>;
