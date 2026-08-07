import { z } from 'zod';

import { questionTypeSchema, quizDifficultySchema } from '../enums';

/**
 * Format JSON documenté pour saisir un lot de questions hors interface
 * (claude.md §7 : `POST /admin/quizzes/import`, `GET /admin/quizzes/:id/export`).
 * Un quiz importé est toujours créé en DRAFT, quel que soit le contenu du
 * fichier — cohérent avec la règle du §10 : rien n'est publié sans relecture
 * humaine.
 */
const importChoiceSchema = z.object({
  position: z.int(),
  label: z.string().min(1),
  isCorrect: z.boolean(),
});

const importAcceptedAnswerSchema = z.object({
  value: z.string().min(1),
  isPrimary: z.boolean(),
});

const importQuestionSchema = z.object({
  position: z.int(),
  type: questionTypeSchema,
  statement: z.string().min(1),
  imageUrl: z.string().nullable().optional(),
  points: z.int().min(1),
  explanation: z.string().min(1),
  source: z.string().min(1),
  choices: z.array(importChoiceSchema).optional(),
  acceptedAnswers: z.array(importAcceptedAnswerSchema).optional(),
});

export const quizImportSchema = z.object({
  themeSlug: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  difficulty: quizDifficultySchema,
  timeLimitSeconds: z.int().positive().nullable().optional(),
  speedBonusEnabled: z.boolean().optional(),
  questions: z.array(importQuestionSchema).min(1),
});
export type QuizImportInput = z.infer<typeof quizImportSchema>;
