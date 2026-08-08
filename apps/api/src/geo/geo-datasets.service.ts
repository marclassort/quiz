import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateGeoDatasetInput, GeoDataset } from '@quiz/shared';

import { Prisma } from '../generated/prisma/client';
import type { GeoDatasetModel } from '../generated/prisma/models';
import { PrismaService } from '../prisma/prisma.service';

function toGeoDataset(dataset: GeoDatasetModel): GeoDataset {
  return { ...dataset, updatedAt: dataset.updatedAt.toISOString() };
}

@Injectable()
export class GeoDatasetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<GeoDataset[]> {
    const datasets = await this.prisma.geoDataset.findMany({ orderBy: { slug: 'asc' } });
    return datasets.map(toGeoDataset);
  }

  async findBySlug(slug: string): Promise<GeoDataset> {
    const dataset = await this.prisma.geoDataset.findUnique({ where: { slug } });
    if (!dataset) {
      throw new NotFoundException('Dataset introuvable.');
    }
    return toGeoDataset(dataset);
  }

  async create(input: CreateGeoDatasetInput): Promise<GeoDataset> {
    try {
      const dataset = await this.prisma.geoDataset.create({ data: input });
      return toGeoDataset(dataset);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ce slug de dataset est déjà utilisé.');
      }
      throw error;
    }
  }
}
