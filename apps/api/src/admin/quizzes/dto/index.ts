import { createZodDto } from 'nestjs-zod';
import {
  adminQuizListQuerySchema,
  createQuizSchema,
  quizImportSchema,
  updateQuizSchema,
} from '@quiz/shared';

export class AdminQuizListQueryDto extends createZodDto(adminQuizListQuerySchema) {}
export class CreateQuizDto extends createZodDto(createQuizSchema) {}
export class UpdateQuizDto extends createZodDto(updateQuizSchema) {}
export class QuizImportDto extends createZodDto(quizImportSchema) {}
