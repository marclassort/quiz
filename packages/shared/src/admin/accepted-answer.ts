import { z } from 'zod';

export const createAcceptedAnswerSchema = z.object({
  value: z.string().min(1).max(100),
  isPrimary: z.boolean().optional(),
});
export type CreateAcceptedAnswerInput = z.infer<typeof createAcceptedAnswerSchema>;

export const updateAcceptedAnswerSchema = createAcceptedAnswerSchema.partial();
export type UpdateAcceptedAnswerInput = z.infer<typeof updateAcceptedAnswerSchema>;
