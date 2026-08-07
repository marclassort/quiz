import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AnswerReviewListQuery } from '@quiz/shared';

import { PrismaService } from '../../prisma/prisma.service';

const PAGE_SIZE = 20;

@Injectable()
export class AdminAnswerReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AnswerReviewListQuery) {
    const where = query.status ? { status: query.status } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.answerReview.findMany({
        where,
        include: {
          question: { select: { statement: true, quiz: { select: { slug: true, title: true } } } },
        },
        orderBy: { occurrences: 'desc' },
        skip: (query.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.answerReview.count({ where }),
    ]);

    return {
      items,
      page: query.page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  }

  /** claude.md §6.3 : "L'admin peut la promouvoir en AcceptedAnswer en un clic
   * depuis le back-office." */
  async accept(id: string, adminUserId: string) {
    const review = await this.findPendingOrThrow(id);

    return this.prisma.$transaction(async (tx) => {
      await tx.acceptedAnswer.create({
        data: { questionId: review.questionId, value: review.submittedText, isPrimary: false },
      });
      return tx.answerReview.update({
        where: { id },
        data: { status: 'ACCEPTED', reviewedBy: adminUserId, reviewedAt: new Date() },
      });
    });
  }

  async reject(id: string, adminUserId: string) {
    await this.findPendingOrThrow(id);
    return this.prisma.answerReview.update({
      where: { id },
      data: { status: 'REJECTED', reviewedBy: adminUserId, reviewedAt: new Date() },
    });
  }

  private async findPendingOrThrow(id: string) {
    const review = await this.prisma.answerReview.findUnique({ where: { id } });
    if (!review) {
      throw new NotFoundException('Révision introuvable.');
    }
    if (review.status !== 'PENDING') {
      throw new ConflictException('Cette révision a déjà été traitée.');
    }
    return review;
  }
}
