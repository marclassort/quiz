import { z } from 'zod';

import { publicQuestionSchema } from './question';

export const submitAnswerSchema = z
  .object({
    questionId: z.uuid(),
    choiceIds: z.array(z.uuid()).optional(),
    text: z.string().trim().min(1).max(100).optional(),
  })
  .refine((value) => (value.choiceIds?.length ?? 0) > 0 || value.text !== undefined, {
    message: 'Fournissez soit choiceIds, soit text.',
  });
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;

export const currentQuestionResponseSchema = z.object({
  attemptId: z.uuid(),
  question: publicQuestionSchema.nullable(),
  completed: z.boolean(),
});
export type CurrentQuestionResponse = z.infer<typeof currentQuestionResponseSchema>;

export const answerResultSchema = z.object({
  isCorrect: z.boolean(),
  correctAnswer: z.union([z.string(), z.array(z.string())]),
  explanation: z.string(),
  pointsEarned: z.int(),
  nextQuestionId: z.uuid().nullable(),
});
export type AnswerResult = z.infer<typeof answerResultSchema>;

export const finishResultSchema = z.object({
  score: z.int(),
  maxScore: z.int(),
  durationMs: z.int(),
  countsForRanking: z.boolean(),
  correctAnswers: z.int(),
  totalAnswers: z.int(),
});
export type FinishResult = z.infer<typeof finishResultSchema>;
