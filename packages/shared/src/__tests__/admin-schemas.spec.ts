import { describe, expect, it } from 'vitest';

import { createChoiceSchema, reorderChoicesSchema } from '../admin/choice';
import { createQuestionSchema } from '../admin/question';
import { createQuizSchema } from '../admin/quiz';
import { quizImportSchema } from '../admin/quiz-import-export';
import { createThemeSchema, updateThemeSchema } from '../admin/theme';

describe('admin schemas', () => {
  it('createThemeSchema exige tous les champs, updateThemeSchema les rend optionnels', () => {
    expect(
      createThemeSchema.safeParse({ slug: 'x', name: 'X', description: 'd', position: 1 }).success,
    ).toBe(true);
    expect(createThemeSchema.safeParse({ slug: 'x' }).success).toBe(false);
    expect(updateThemeSchema.safeParse({ slug: 'x' }).success).toBe(true);
  });

  it('createQuizSchema exige themeSlug + difficulty', () => {
    expect(
      createQuizSchema.safeParse({
        themeSlug: 't',
        slug: 'q',
        title: 'Q',
        description: 'd',
        difficulty: 'EASY',
      }).success,
    ).toBe(true);
    expect(createQuizSchema.safeParse({ themeSlug: 't', slug: 'q' }).success).toBe(false);
  });

  it('createQuestionSchema exige quizId, explanation et source', () => {
    const questionId = '11111111-1111-4111-8111-111111111111';
    expect(
      createQuestionSchema.safeParse({
        quizId: questionId,
        position: 1,
        type: 'SINGLE_CHOICE',
        statement: 'S',
        explanation: 'E',
        source: 'Src',
      }).success,
    ).toBe(true);
    expect(
      createQuestionSchema.safeParse({
        quizId: questionId,
        position: 1,
        type: 'SINGLE_CHOICE',
        statement: 'S',
      }).success,
    ).toBe(false);
  });

  it('createChoiceSchema / reorderChoicesSchema', () => {
    expect(createChoiceSchema.safeParse({ position: 1, label: 'A', isCorrect: true }).success).toBe(
      true,
    );
    expect(
      reorderChoicesSchema.safeParse({
        orderedChoiceIds: ['11111111-1111-4111-8111-111111111111'],
      }).success,
    ).toBe(true);
    expect(reorderChoicesSchema.safeParse({ orderedChoiceIds: [] }).success).toBe(false);
  });

  it('quizImportSchema exige au moins une question', () => {
    const valid = {
      themeSlug: 't',
      slug: 'q',
      title: 'Q',
      description: 'd',
      difficulty: 'EASY',
      questions: [
        {
          position: 1,
          type: 'FREE_TEXT',
          statement: 'S',
          points: 1,
          explanation: 'E',
          source: 'Src',
          acceptedAnswers: [{ value: 'x', isPrimary: true }],
        },
      ],
    };
    expect(quizImportSchema.safeParse(valid).success).toBe(true);
    expect(quizImportSchema.safeParse({ ...valid, questions: [] }).success).toBe(false);
  });
});
