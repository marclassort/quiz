import { createZodDto } from 'nestjs-zod';
import { createThemeSchema, updateThemeSchema } from '@quiz/shared';

export class CreateThemeDto extends createZodDto(createThemeSchema) {}
export class UpdateThemeDto extends createZodDto(updateThemeSchema) {}
