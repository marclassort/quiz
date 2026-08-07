import { createZodDto } from 'nestjs-zod';
import { createGeoDatasetSchema } from '@quiz/shared';

export class CreateGeoDatasetDto extends createZodDto(createGeoDatasetSchema) {}
