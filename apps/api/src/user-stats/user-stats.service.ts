import { Injectable } from '@nestjs/common';

import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * claude.md §6.4 : "UserStats mis à jour de façon transactionnelle à la fin
 * de chaque Attempt comptabilisé". Recalcul complet (pas incrémental) à
 * chaque appel : à l'échelle de ce projet (une vingtaine de questions par
 * quiz), le coût d'un recalcul complet par utilisateur est négligeable, et
 * ça évite toute dérive entre un compteur incrémental et la réalité — le
 * même code sert donc à la mise à jour normale, au rattachement de compte
 * (§4.3) et à la commande CLI de reconstruction complète.
 */
@Injectable()
export class UserStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async recomputeForUser(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;

    const rankedAttempts = await client.attempt.findMany({
      where: { userId, countsForRanking: true, finishedAt: { not: null } },
      select: { id: true, score: true, finishedAt: true },
    });

    const answerStats = await client.attemptAnswer.aggregate({
      where: { attemptId: { in: rankedAttempts.map((a) => a.id) } },
      _count: { _all: true },
    });
    const correctAnswers = await client.attemptAnswer.count({
      where: { attemptId: { in: rankedAttempts.map((a) => a.id) }, isCorrect: true },
    });

    const totalScore = rankedAttempts.reduce((sum, a) => sum + a.score, 0);
    const totalAnswers = answerStats._count._all;
    const averageAccuracy = totalAnswers > 0 ? correctAnswers / totalAnswers : 0;
    const lastPlayedAt = rankedAttempts.reduce<Date | null>((latest, a) => {
      if (!a.finishedAt) return latest;
      return !latest || a.finishedAt > latest ? a.finishedAt : latest;
    }, null);

    await client.userStats.upsert({
      where: { userId },
      create: {
        userId,
        totalScore,
        quizzesCompleted: rankedAttempts.length,
        correctAnswers,
        totalAnswers,
        averageAccuracy,
        lastPlayedAt,
      },
      update: {
        totalScore,
        quizzesCompleted: rankedAttempts.length,
        correctAnswers,
        totalAnswers,
        averageAccuracy,
        lastPlayedAt,
      },
    });
  }
}
