import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { GeoDatasetsService } from './geo-datasets.service';

/**
 * Métadonnées et attribution seulement (data-and-api.md §4) — les géométries
 * elles-mêmes sont servies en statique depuis apps/web/public/geo/ (ADR 001).
 */
@ApiTags('geo')
@Controller('geo/datasets')
@Public()
export class GeoDatasetsController {
  constructor(private readonly geoDatasetsService: GeoDatasetsService) {}

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.geoDatasetsService.findBySlug(slug);
  }
}
