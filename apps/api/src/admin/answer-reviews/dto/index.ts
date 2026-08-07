import { createZodDto } from 'nestjs-zod';
import { answerReviewListQuerySchema } from '@quiz/shared';

export class AnswerReviewListQueryDto extends createZodDto(answerReviewListQuerySchema) {}
