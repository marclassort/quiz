import { z } from 'zod';

export const createThemeSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().min(1),
  position: z.int(),
});
export type CreateThemeInput = z.infer<typeof createThemeSchema>;

export const updateThemeSchema = createThemeSchema.partial();
export type UpdateThemeInput = z.infer<typeof updateThemeSchema>;
