import { z } from 'zod';

export const userRoleSchema = z.enum(['USER', 'ADMIN']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const quizDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);
export type QuizDifficulty = z.infer<typeof quizDifficultySchema>;

export const quizStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export type QuizStatus = z.infer<typeof quizStatusSchema>;

export const questionTypeSchema = z.enum([
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'FREE_TEXT',
]);
export type QuestionType = z.infer<typeof questionTypeSchema>;

export const answerReviewStatusSchema = z.enum(['PENDING', 'ACCEPTED', 'REJECTED']);
export type AnswerReviewStatus = z.infer<typeof answerReviewStatusSchema>;
