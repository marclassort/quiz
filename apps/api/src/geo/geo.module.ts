import { Module } from '@nestjs/common';

import { GeoDatasetsController } from './geo-datasets.controller';
import { GeoDatasetsService } from './geo-datasets.service';

@Module({
  controllers: [GeoDatasetsController],
  providers: [GeoDatasetsService],
  exports: [GeoDatasetsService],
})
export class GeoModule {}
