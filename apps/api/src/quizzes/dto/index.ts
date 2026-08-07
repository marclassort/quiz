import { createZodDto } from 'nestjs-zod';
import { quizListQuerySchema } from '@quiz/shared';

export class QuizListQueryDto extends createZodDto(quizListQuerySchema) {}
