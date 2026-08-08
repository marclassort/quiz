import { z } from 'zod';

import { publicQuestionSchema } from './question';

export const submitAnswerSchema = z
  .object({
    questionId: z.uuid(),
    choiceIds: z.array(z.uuid()).optional(),
    text: z.string().trim().min(1).max(100).optional(),
    /** `MAP_CLICK` : identifiant de la feature cliquée. */
    featureId: z.string().min(1).optional(),
    /** `MAP_PLACE` : point soumis, validé serveur contre la cible. */
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  })
  .refine(
    (value) =>
      (value.choiceIds?.length ?? 0) > 0 ||
      value.text !== undefined ||
      value.featureId !== undefined ||
      (value.lat !== undefined && value.lng !== undefined),
    { message: 'Fournissez choiceIds, text, featureId, ou lat et lng.' },
  );
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
  /** `MAP_PLACE` uniquement : distance orthodromique à la cible, en km. */
  distanceKm: z.number().optional(),
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
