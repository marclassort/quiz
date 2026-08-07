import { describe, expect, it } from 'vitest';

import {
  answerReviewStatusSchema,
  questionTypeSchema,
  quizDifficultySchema,
  quizStatusSchema,
  userRoleSchema,
} from '../enums';

describe('enums', () => {
  it('accepte les valeurs valides et rejette les autres', () => {
    expect(userRoleSchema.safeParse('ADMIN').success).toBe(true);
    expect(userRoleSchema.safeParse('SUPERADMIN').success).toBe(false);

    expect(quizDifficultySchema.safeParse('MEDIUM').success).toBe(true);
    expect(quizDifficultySchema.safeParse('IMPOSSIBLE').success).toBe(false);

    expect(quizStatusSchema.safeParse('PUBLISHED').success).toBe(true);
    expect(quizStatusSchema.safeParse('DELETED').success).toBe(false);

    expect(questionTypeSchema.safeParse('FREE_TEXT').success).toBe(true);
    expect(questionTypeSchema.safeParse('DRAG_AND_DROP').success).toBe(false);

    expect(answerReviewStatusSchema.safeParse('ACCEPTED').success).toBe(true);
    expect(answerReviewStatusSchema.safeParse('IGNORED').success).toBe(false);
  });
});
