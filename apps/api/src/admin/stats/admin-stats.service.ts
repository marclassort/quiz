import { Injectable } from '@nestjs/common';
import type { AdminStats } from '@quiz/shared';

import { PrismaService } from '../../prisma/prisma.service';

interface QuestionSuccessRow {
  questionId: string;
  statement: string;
  quizSlug: string;
  total: bigint;
  correct: bigint;
}

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** claude.md §7 : "utile pour repérer les questions mal formulées" — triées
   * par taux de réussite croissant, les plus problématiques en tête. */
  async getStats(): Promise<AdminStats> {
    const [totalAttempts, finishedAttempts, totalQuizzes, totalQuestions] = await Promise.all([
      this.prisma.attempt.count(),
      this.prisma.attempt.count({ where: { finishedAt: { not: null } } }),
      this.prisma.quiz.count(),
      this.prisma.question.count(),
    ]);

    const rows = await this.prisma.$queryRaw<QuestionSuccessRow[]>`
      SELECT q.id AS "questionId", q.statement, qz.slug AS "quizSlug",
        COUNT(aa.id) AS total,
        SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END) AS correct
      FROM questions q
      JOIN quizzes qz ON qz.id = q.quiz_id
      LEFT JOIN attempt_answers aa ON aa.question_id = q.id
      GROUP BY q.id, q.statement, qz.slug
      HAVING COUNT(aa.id) > 0
      ORDER BY (SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END)::float / COUNT(aa.id)) ASC
    `;

    return {
      totalAttempts,
      finishedAttempts,
      totalQuizzes,
      totalQuestions,
      questionSuccessRates: rows.map((row) => {
        const total = Number(row.total);
        const correct = Number(row.correct);
        return {
          questionId: row.questionId,
          statement: row.statement,
          quizSlug: row.quizSlug,
          totalAnswers: total,
          correctAnswers: correct,
          successRate: total > 0 ? correct / total : 0,
        };
      }),
    };
  }
}
