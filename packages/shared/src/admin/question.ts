import { z } from 'zod';

import { questionTypeSchema, quizStatusSchema } from '../enums';

export const createQuestionSchema = z.object({
  quizId: z.uuid(),
  position: z.int().min(1),
  type: questionTypeSchema,
  statement: z.string().min(1),
  imageUrl: z.string().nullable().optional(),
  points: z.int().min(1).default(1),
  // explanation/source peuvent être vides à la création (édition incrémentale
  // d'un brouillon) : claude.md §9 les rend obligatoires seulement "à la
  // publication", contrôle appliqué côté serveur dans AdminQuizzesService.publish().
  explanation: z.string(),
  source: z.string(),
});
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

export const updateQuestionSchema = createQuestionSchema.omit({ quizId: true }).partial();
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;

export const adminQuestionListQuerySchema = z.object({
  theme: z.string().optional(),
  quizId: z.uuid().optional(),
  type: questionTypeSchema.optional(),
  status: quizStatusSchema.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
});
export type AdminQuestionListQuery = z.infer<typeof adminQuestionListQuerySchema>;

/** claude.md §9 : "Journal des modifications (qui a modifié quoi, quand) sur
 * les questions publiées." */
export const questionAuditLogEntrySchema = z.object({
  id: z.uuid(),
  action: z.enum(['created', 'updated']),
  changedAt: z.string(),
  changedByDisplayName: z.string().nullable(),
});
export type QuestionAuditLogEntry = z.infer<typeof questionAuditLogEntrySchema>;
