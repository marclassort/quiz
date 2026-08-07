import { z } from 'zod';

export const createChoiceSchema = z.object({
  position: z.int().min(1),
  label: z.string().min(1).max(300),
  isCorrect: z.boolean(),
});
export type CreateChoiceInput = z.infer<typeof createChoiceSchema>;

export const updateChoiceSchema = createChoiceSchema.partial();
export type UpdateChoiceInput = z.infer<typeof updateChoiceSchema>;

export const reorderChoicesSchema = z.object({
  orderedChoiceIds: z.array(z.uuid()).min(1),
});
export type ReorderChoicesInput = z.infer<typeof reorderChoicesSchema>;
