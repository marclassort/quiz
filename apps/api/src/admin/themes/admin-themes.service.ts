import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateThemeInput, UpdateThemeInput } from '@quiz/shared';

import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminThemesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.theme.findMany({ orderBy: { position: 'asc' } });
  }

  async findOne(id: string) {
    const theme = await this.prisma.theme.findUnique({ where: { id } });
    if (!theme) {
      throw new NotFoundException('Thème introuvable.');
    }
    return theme;
  }

  async create(input: CreateThemeInput) {
    try {
      return await this.prisma.theme.create({ data: input });
    } catch (error) {
      throw this.mapUniqueConstraint(error);
    }
  }

  async update(id: string, input: UpdateThemeInput) {
    await this.findOne(id);
    try {
      return await this.prisma.theme.update({ where: { id }, data: input });
    } catch (error) {
      throw this.mapUniqueConstraint(error);
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    try {
      await this.prisma.theme.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Ce thème contient des quiz : supprimez-les d’abord.');
      }
      throw error;
    }
  }

  private mapUniqueConstraint(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ConflictException('Ce slug de thème est déjà utilisé.');
    }
    return error;
  }
}
