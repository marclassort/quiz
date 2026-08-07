import { z } from 'zod';

import { answerReviewStatusSchema } from '../enums';

export const answerReviewListQuerySchema = z.object({
  status: answerReviewStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
});
export type AnswerReviewListQuery = z.infer<typeof answerReviewListQuerySchema>;
