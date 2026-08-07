import { createZodDto } from 'nestjs-zod';
import { submitAnswerSchema } from '@quiz/shared';

export class SubmitAnswerDto extends createZodDto(submitAnswerSchema) {}
