import { createZodDto } from 'nestjs-zod';
import { paginationQuerySchema, updateMeSchema } from '@quiz/shared';

export class UpdateMeDto extends createZodDto(updateMeSchema) {}
export class MyAttemptsQueryDto extends createZodDto(paginationQuerySchema) {}
