import { questionTypeSchema, registerSchema } from '@quiz/shared';

describe('@quiz/shared (consommé depuis apps/api)', () => {
  it('expose les enums et schémas Zod partagés', () => {
    expect(questionTypeSchema.safeParse('FREE_TEXT').success).toBe(true);
    expect(
      registerSchema.safeParse({
        email: 'napoleon@example.com',
        password: 'motdepassesolide',
        displayName: 'Napoleon',
      }).success,
    ).toBe(true);
  });
});
