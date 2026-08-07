import { z } from 'zod';

export const questionSuccessRateSchema = z.object({
  questionId: z.uuid(),
  statement: z.string(),
  quizSlug: z.string(),
  totalAnswers: z.int(),
  correctAnswers: z.int(),
  successRate: z.number(),
});
export type QuestionSuccessRate = z.infer<typeof questionSuccessRateSchema>;

export const adminStatsSchema = z.object({
  totalAttempts: z.int(),
  finishedAttempts: z.int(),
  totalQuizzes: z.int(),
  totalQuestions: z.int(),
  questionSuccessRates: z.array(questionSuccessRateSchema),
});
export type AdminStats = z.infer<typeof adminStatsSchema>;
