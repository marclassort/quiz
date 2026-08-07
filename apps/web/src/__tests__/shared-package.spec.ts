import { describe, expect, it } from 'vitest';
import { quizDifficultySchema, registerSchema } from '@quiz/shared';

describe('@quiz/shared (consommé depuis apps/web)', () => {
  it('expose les enums et schémas Zod partagés', () => {
    expect(quizDifficultySchema.safeParse('MEDIUM').success).toBe(true);
    expect(
      registerSchema.safeParse({
        email: 'napoleon@example.com',
        password: 'motdepassesolide',
        displayName: 'Napoleon',
      }).success,
    ).toBe(true);
  });
});
