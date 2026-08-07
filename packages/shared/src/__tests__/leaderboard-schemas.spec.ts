import { describe, expect, it } from 'vitest';

import { leaderboardQuerySchema } from '../quiz/leaderboard';

describe('leaderboardQuerySchema', () => {
  it('scope global par défaut, pas besoin de themeSlug', () => {
    const result = leaderboardQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ scope: 'global', page: 1 });
  });

  it('scope theme exige themeSlug', () => {
    expect(leaderboardQuerySchema.safeParse({ scope: 'theme' }).success).toBe(false);
    expect(
      leaderboardQuerySchema.safeParse({ scope: 'theme', themeSlug: 'napoleon' }).success,
    ).toBe(true);
  });

  it('scope 30d ne nécessite pas themeSlug', () => {
    expect(leaderboardQuerySchema.safeParse({ scope: '30d' }).success).toBe(true);
  });

  it('rejette un scope invalide', () => {
    expect(leaderboardQuerySchema.safeParse({ scope: 'annuel' }).success).toBe(false);
  });
});
