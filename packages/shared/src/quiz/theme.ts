import { z } from 'zod';

export const themeSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  position: z.int(),
});
export type Theme = z.infer<typeof themeSchema>;
