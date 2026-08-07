import { Injectable, NotFoundException } from '@nestjs/common';
import type { Theme } from '@quiz/shared';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ThemesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Theme[]> {
    return this.prisma.theme.findMany({ orderBy: { position: 'asc' } });
  }

  async findBySlug(slug: string): Promise<Theme> {
    const theme = await this.prisma.theme.findUnique({ where: { slug } });

    if (!theme) {
      throw new NotFoundException('Thème introuvable.');
    }

    return theme;
  }
}
