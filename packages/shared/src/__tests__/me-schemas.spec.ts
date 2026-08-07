import { describe, expect, it } from 'vitest';

import { updateMeSchema } from '../user/me';

describe('updateMeSchema', () => {
  it('accepte une mise à jour du displayName seul', () => {
    expect(updateMeSchema.safeParse({ displayName: 'Napoleon' }).success).toBe(true);
  });

  it('accepte une mise à jour de excludedFromLeaderboard seul', () => {
    expect(updateMeSchema.safeParse({ excludedFromLeaderboard: true }).success).toBe(true);
  });

  it('rejette un objet vide', () => {
    expect(updateMeSchema.safeParse({}).success).toBe(false);
  });

  it('rejette un displayName invalide', () => {
    expect(updateMeSchema.safeParse({ displayName: 'ab' }).success).toBe(false);
  });
});
