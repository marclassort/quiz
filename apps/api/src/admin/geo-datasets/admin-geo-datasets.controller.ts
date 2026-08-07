import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Roles } from '../../auth/decorators/roles.decorator';
import { GeoDatasetsService } from '../../geo/geo-datasets.service';
import { CreateGeoDatasetDto } from './dto';

@ApiTags('admin/geo-datasets')
@Controller('admin/geo-datasets')
@Roles('ADMIN')
export class AdminGeoDatasetsController {
  constructor(private readonly geoDatasetsService: GeoDatasetsService) {}

  @Get()
  findAll() {
    return this.geoDatasetsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateGeoDatasetDto) {
    return this.geoDatasetsService.create(dto);
  }
}
