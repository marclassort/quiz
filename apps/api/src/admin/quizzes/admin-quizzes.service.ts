import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminQuizListQuery,
  CreateQuizInput,
  QuizImportInput,
  UpdateQuizInput,
} from '@quiz/shared';

import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const PAGE_SIZE = 20;

@Injectable()
export class AdminQuizzesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AdminQuizListQuery) {
    const where = {
      ...(query.theme ? { theme: { slug: query.theme } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.quiz.findMany({
        where,
        include: { theme: { select: { slug: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.quiz.count({ where }),
    ]);

    return {
      items,
      page: query.page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  }

  async findOne(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: { theme: { select: { slug: true, name: true } } },
    });
    if (!quiz) {
      throw new NotFoundException('Quiz introuvable.');
    }
    return quiz;
  }

  async create(input: CreateQuizInput) {
    const theme = await this.findThemeBySlugOrThrow(input.themeSlug);
    try {
      return await this.prisma.quiz.create({
        data: {
          themeId: theme.id,
          slug: input.slug,
          title: input.title,
          description: input.description,
          difficulty: input.difficulty,
          timeLimitSeconds: input.timeLimitSeconds,
          speedBonusEnabled: input.speedBonusEnabled ?? false,
        },
      });
    } catch (error) {
      throw this.mapUniqueConstraint(error);
    }
  }

  async update(id: string, input: UpdateQuizInput) {
    await this.findOne(id);

    const { themeSlug, ...rest } = input;
    const themeId = themeSlug ? (await this.findThemeBySlugOrThrow(themeSlug)).id : undefined;

    try {
      return await this.prisma.quiz.update({
        where: { id },
        data: { ...rest, ...(themeId ? { themeId } : {}) },
      });
    } catch (error) {
      throw this.mapUniqueConstraint(error);
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    try {
      await this.prisma.quiz.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'Ce quiz a déjà été joué : archivez-le plutôt que de le supprimer.',
        );
      }
      throw error;
    }
  }

  /**
   * claude.md §9 : "Champs explanation et source obligatoires à la
   * publication ; blocage de la publication d'un quiz contenant une
   * question sans source."
   */
  async publish(id: string) {
    await this.findOne(id);
    const questions = await this.prisma.question.findMany({ where: { quizId: id } });

    if (questions.length === 0) {
      throw new BadRequestException('Impossible de publier un quiz sans questions.');
    }

    const missingSource = questions.filter((q) => q.source.trim().length === 0);
    const missingExplanation = questions.filter((q) => q.explanation.trim().length === 0);

    if (missingSource.length > 0 || missingExplanation.length > 0) {
      throw new BadRequestException({
        message: 'Publication bloquée : source et explication obligatoires sur chaque question.',
        missingSourceQuestionIds: missingSource.map((q) => q.id),
        missingExplanationQuestionIds: missingExplanation.map((q) => q.id),
      });
    }

    return this.prisma.quiz.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        questionCount: questions.length,
      },
    });
  }

  async unpublish(id: string) {
    await this.findOne(id);
    return this.prisma.quiz.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  /** "Prévisualisation comme un joueur avant publication" (claude.md §9) : accès admin
   * complet (avec isCorrect), y compris pour un quiz encore en DRAFT. */
  async preview(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          include: { choices: { orderBy: { position: 'asc' } }, acceptedAnswers: true },
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!quiz) {
      throw new NotFoundException('Quiz introuvable.');
    }
    return quiz;
  }

  async exportQuiz(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        theme: { select: { slug: true } },
        questions: {
          include: { choices: { orderBy: { position: 'asc' } }, acceptedAnswers: true },
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!quiz) {
      throw new NotFoundException('Quiz introuvable.');
    }

    return {
      themeSlug: quiz.theme.slug,
      slug: quiz.slug,
      title: quiz.title,
      description: quiz.description,
      difficulty: quiz.difficulty,
      timeLimitSeconds: quiz.timeLimitSeconds,
      speedBonusEnabled: quiz.speedBonusEnabled,
      questions: quiz.questions.map((question) => ({
        position: question.position,
        type: question.type,
        statement: question.statement,
        imageUrl: question.imageUrl,
        points: question.points,
        explanation: question.explanation,
        source: question.source,
        choices: question.choices.map((choice) => ({
          position: choice.position,
          label: choice.label,
          isCorrect: choice.isCorrect,
        })),
        acceptedAnswers: question.acceptedAnswers.map((answer) => ({
          value: answer.value,
          isPrimary: answer.isPrimary,
        })),
      })),
    };
  }

  /** Toujours importé en DRAFT, quel que soit le contenu du fichier (§10 : rien
   * n'est publié sans relecture humaine). */
  async importQuiz(input: QuizImportInput) {
    const theme = await this.findThemeBySlugOrThrow(input.themeSlug);

    try {
      return await this.prisma.quiz.create({
        data: {
          themeId: theme.id,
          slug: input.slug,
          title: input.title,
          description: input.description,
          difficulty: input.difficulty,
          timeLimitSeconds: input.timeLimitSeconds,
          speedBonusEnabled: input.speedBonusEnabled ?? false,
          status: 'DRAFT',
          questionCount: input.questions.length,
          questions: {
            create: input.questions.map((question) => ({
              position: question.position,
              type: question.type,
              statement: question.statement,
              imageUrl: question.imageUrl,
              points: question.points,
              explanation: question.explanation,
              source: question.source,
              choices: question.choices ? { create: question.choices } : undefined,
              acceptedAnswers: question.acceptedAnswers
                ? { create: question.acceptedAnswers }
                : undefined,
            })),
          },
        },
        include: { questions: true },
      });
    } catch (error) {
      throw this.mapUniqueConstraint(error);
    }
  }

  private async findThemeBySlugOrThrow(slug: string) {
    const theme = await this.prisma.theme.findUnique({ where: { slug } });
    if (!theme) {
      throw new NotFoundException('Thème introuvable.');
    }
    return theme;
  }

  private mapUniqueConstraint(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ConflictException('Ce slug de quiz est déjà utilisé.');
    }
    return error;
  }
}
