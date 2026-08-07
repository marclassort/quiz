import { describe, expect, it } from 'vitest';

import { publicQuestionSchema } from '../quiz/question';
import { quizListQuerySchema } from '../quiz/quiz';
import { submitAnswerSchema } from '../quiz/attempt';

describe('quizListQuerySchema', () => {
  it('accepte des filtres optionnels et une page par défaut', () => {
    expect(quizListQuerySchema.parse({})).toEqual({ page: 1 });
    expect(quizListQuerySchema.parse({ theme: 'napoleon', difficulty: 'EASY' })).toMatchObject({
      theme: 'napoleon',
      difficulty: 'EASY',
    });
  });

  it('rejette une difficulté invalide', () => {
    expect(quizListQuerySchema.safeParse({ difficulty: 'IMPOSSIBLE' }).success).toBe(false);
  });
});

describe('publicQuestionSchema', () => {
  it('ne contient jamais de drapeau isCorrect sur les choix', () => {
    const question = {
      id: '11111111-1111-4111-8111-111111111111',
      position: 1,
      type: 'SINGLE_CHOICE',
      statement: 'Question ?',
      imageUrl: null,
      points: 1,
      choices: [{ id: '22222222-2222-4222-8222-222222222222', position: 1, label: 'Réponse' }],
    };

    const result = publicQuestionSchema.safeParse(question);
    expect(result.success).toBe(true);
    expect((result.data?.choices[0] as Record<string, unknown>).isCorrect).toBeUndefined();
  });
});

describe('submitAnswerSchema', () => {
  const questionId = '11111111-1111-4111-8111-111111111111';

  it('accepte choiceIds seul', () => {
    expect(
      submitAnswerSchema.safeParse({
        questionId,
        choiceIds: ['22222222-2222-4222-8222-222222222222'],
      }).success,
    ).toBe(true);
  });

  it('accepte text seul', () => {
    expect(submitAnswerSchema.safeParse({ questionId, text: 'Austerlitz' }).success).toBe(true);
  });

  it('rejette si ni choiceIds ni text ne sont fournis', () => {
    expect(submitAnswerSchema.safeParse({ questionId }).success).toBe(false);
  });
});
