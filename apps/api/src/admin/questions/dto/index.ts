import { createZodDto } from 'nestjs-zod';
import {
  adminQuestionListQuerySchema,
  createAcceptedAnswerSchema,
  createChoiceSchema,
  createQuestionSchema,
  reorderChoicesSchema,
  updateAcceptedAnswerSchema,
  updateChoiceSchema,
  updateQuestionPayloadSchema,
  updateQuestionSchema,
} from '@quiz/shared';

export class AdminQuestionListQueryDto extends createZodDto(adminQuestionListQuerySchema) {}
export class CreateQuestionDto extends createZodDto(createQuestionSchema) {}
export class UpdateQuestionDto extends createZodDto(updateQuestionSchema) {}
export class UpdateQuestionPayloadDto extends createZodDto(updateQuestionPayloadSchema) {}
export class CreateChoiceDto extends createZodDto(createChoiceSchema) {}
export class UpdateChoiceDto extends createZodDto(updateChoiceSchema) {}
export class ReorderChoicesDto extends createZodDto(reorderChoicesSchema) {}
export class CreateAcceptedAnswerDto extends createZodDto(createAcceptedAnswerSchema) {}
export class UpdateAcceptedAnswerDto extends createZodDto(updateAcceptedAnswerSchema) {}
