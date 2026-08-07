import { Injectable, NotFoundException } from '@nestjs/common';
import type { QuizDetail, QuizListQuery, QuizSummary } from '@quiz/shared';

import { PrismaService } from '../prisma/prisma.service';
import type { QuizModel as Quiz } from '../generated/prisma/models';

const PAGE_SIZE = 20;

function toQuizSummary(quiz: Quiz & { theme: { slug: string } }): QuizSummary {
  return {
    id: quiz.id,
    slug: quiz.slug,
    title: quiz.title,
    description: quiz.description,
    difficulty: quiz.difficulty,
    questionCount: quiz.questionCount,
    timeLimitSeconds: quiz.timeLimitSeconds,
    themeSlug: quiz.theme.slug,
  };
}

@Injectable()
export class QuizzesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QuizListQuery): Promise<{
    items: QuizSummary[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }> {
    const where = {
      status: 'PUBLISHED' as const,
      ...(query.theme ? { theme: { slug: query.theme } } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
    };

    const [quizzes, total] = await this.prisma.$transaction([
      this.prisma.quiz.findMany({
        where,
        include: { theme: { select: { slug: true } } },
        orderBy: { publishedAt: 'desc' },
        skip: (query.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.quiz.count({ where }),
    ]);

    return {
      items: quizzes.map(toQuizSummary),
      page: query.page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  }

  async findBySlug(slug: string): Promise<QuizDetail> {
    const quiz = await this.prisma.quiz.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: { theme: { select: { slug: true } } },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz introuvable.');
    }

    return { ...toQuizSummary(quiz), speedBonusEnabled: quiz.speedBonusEnabled };
  }

  /**
   * Utilisé par AttemptsService : contrairement à findBySlug, renvoie
   * l'entité Prisma complète (nécessaire pour calculer maxScore, vérifier
   * speedBonusEnabled/timeLimitSeconds pendant la partie).
   */
  async getPublishedQuizEntityBySlug(slug: string) {
    const quiz = await this.prisma.quiz.findFirst({ where: { slug, status: 'PUBLISHED' } });

    if (!quiz) {
      throw new NotFoundException('Quiz introuvable.');
    }

    return quiz;
  }
}
