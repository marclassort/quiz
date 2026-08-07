import { randomUUID } from 'node:crypto';

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Me, MyAttemptSummary, MyStats, UpdateMeInput } from '@quiz/shared';

import { Prisma } from '../generated/prisma/client';
import type { UserModel } from '../generated/prisma/models';
import { PrismaService } from '../prisma/prisma.service';

const ATTEMPTS_PAGE_SIZE = 20;

function toMe(user: UserModel): Me {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    excludedFromLeaderboard: user.excludedFromLeaderboard,
    createdAt: user.createdAt.toISOString(),
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string): Promise<Me> {
    const user = await this.findActiveUserOrThrow(userId);
    return toMe(user);
  }

  async updateMe(userId: string, input: UpdateMeInput): Promise<Me> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
          ...(input.excludedFromLeaderboard !== undefined
            ? { excludedFromLeaderboard: input.excludedFromLeaderboard }
            : {}),
        },
      });
      return toMe(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ce nom public est déjà utilisé.');
      }
      throw error;
    }
  }

  /**
   * Droit à l'effacement (claude.md §11) : anonymise les Attempt (dissocie
   * l'utilisateur, conserve les statistiques agrégées — chaque ligne garde
   * son score/ses réponses, seul le lien vers la personne disparaît) et
   * supprime les données personnelles du compte (soft delete, cf. §3
   * `deletedAt`). Un nouveau guestToken aléatoire par ligne est nécessaire
   * pour respecter la contrainte "userId XOR guestToken non nul" posée au
   * lot 5 ; `gen_random_uuid()` en SQL garantit une valeur différente par
   * ligne en une seule requête.
   */
  async deleteMe(userId: string): Promise<void> {
    await this.findActiveUserOrThrow(userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE attempts SET user_id = NULL, guest_token = gen_random_uuid()
        WHERE user_id = ${userId}::uuid
      `;

      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.userStats.deleteMany({ where: { userId } });

      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          email: `deleted-${userId}@deleted.invalid`,
          displayName: `Utilisateur supprimé ${userId.slice(0, 8)}`,
          passwordHash: randomUUID(),
          emailVerifiedAt: null,
          passwordResetTokenHash: null,
          passwordResetTokenExpiresAt: null,
          excludedFromLeaderboard: true,
        },
      });
    });
  }

  async exportMe(userId: string) {
    const user = await this.findActiveUserOrThrow(userId);
    const stats = await this.prisma.userStats.findUnique({ where: { userId } });

    const attempts = await this.prisma.attempt.findMany({
      where: { userId },
      include: { quiz: { select: { slug: true, title: true } }, answers: true },
      orderBy: { startedAt: 'desc' },
    });

    return {
      exportedAt: new Date().toISOString(),
      user: toMe(user),
      stats: stats ? toMyStats(stats) : null,
      attempts: attempts.map((attempt) => ({
        id: attempt.id,
        quizSlug: attempt.quiz.slug,
        quizTitle: attempt.quiz.title,
        startedAt: attempt.startedAt.toISOString(),
        finishedAt: attempt.finishedAt?.toISOString() ?? null,
        score: attempt.score,
        maxScore: attempt.maxScore,
        durationMs: attempt.durationMs,
        countsForRanking: attempt.countsForRanking,
        answers: attempt.answers.map((answer) => ({
          questionId: answer.questionId,
          submittedAt: answer.submittedAt.toISOString(),
          rawAnswer: answer.rawAnswer,
          isCorrect: answer.isCorrect,
          pointsEarned: answer.pointsEarned,
          answerTimeMs: answer.answerTimeMs,
        })),
      })),
    };
  }

  async getMyAttempts(
    userId: string,
    page: number,
  ): Promise<{
    items: MyAttemptSummary[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }> {
    const [attempts, total] = await this.prisma.$transaction([
      this.prisma.attempt.findMany({
        where: { userId },
        include: { quiz: { select: { slug: true, title: true } } },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * ATTEMPTS_PAGE_SIZE,
        take: ATTEMPTS_PAGE_SIZE,
      }),
      this.prisma.attempt.count({ where: { userId } }),
    ]);

    return {
      items: attempts.map((attempt) => ({
        id: attempt.id,
        quizSlug: attempt.quiz.slug,
        quizTitle: attempt.quiz.title,
        startedAt: attempt.startedAt.toISOString(),
        finishedAt: attempt.finishedAt?.toISOString() ?? null,
        score: attempt.score,
        maxScore: attempt.maxScore,
        countsForRanking: attempt.countsForRanking,
      })),
      page,
      pageSize: ATTEMPTS_PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / ATTEMPTS_PAGE_SIZE)),
    };
  }

  async getMyStats(userId: string): Promise<MyStats> {
    const stats = await this.prisma.userStats.findUnique({ where: { userId } });
    return stats
      ? toMyStats(stats)
      : {
          totalScore: 0,
          quizzesCompleted: 0,
          correctAnswers: 0,
          totalAnswers: 0,
          averageAccuracy: 0,
          lastPlayedAt: null,
        };
  }

  private async findActiveUserOrThrow(userId: string): Promise<UserModel> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt !== null) {
      throw new NotFoundException('Utilisateur introuvable.');
    }
    return user;
  }
}

function toMyStats(stats: {
  totalScore: number;
  quizzesCompleted: number;
  correctAnswers: number;
  totalAnswers: number;
  averageAccuracy: number;
  lastPlayedAt: Date | null;
}): MyStats {
  return {
    totalScore: stats.totalScore,
    quizzesCompleted: stats.quizzesCompleted,
    correctAnswers: stats.correctAnswers,
    totalAnswers: stats.totalAnswers,
    averageAccuracy: stats.averageAccuracy,
    lastPlayedAt: stats.lastPlayedAt?.toISOString() ?? null,
  };
}
