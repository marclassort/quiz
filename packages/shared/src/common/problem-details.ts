import { z } from 'zod';

/**
 * Format d'erreur RFC 9457 (application/problem+json) — cf. claude.md §7.
 */
export const problemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
});
export type ProblemDetails = z.infer<typeof problemDetailsSchema>;
