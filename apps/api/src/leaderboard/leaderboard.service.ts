import { Injectable, NotFoundException } from '@nestjs/common';
import type { LeaderboardEntry, LeaderboardScope, MyRankResponse } from '@quiz/shared';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * claude.md §6.4 : classement à trois vues (global / thème / 30 jours
 * glissants), seuil d'éligibilité de 3 quiz terminés, départage par
 * totalScore puis averageAccuracy puis date de première inscription. Calculé
 * en SQL brut : l'agrégation croise Attempt (score, comptage) et
 * AttemptAnswer (précision), ce que `groupBy` de Prisma ne sait pas exprimer
 * en une seule requête à travers une relation.
 */

interface RawLeaderboardRow {
  userId: string;
  displayName: string;
  totalScore: number;
  quizzesCompleted: number;
  averageAccuracy: number;
}

interface RawRankedRow extends RawLeaderboardRow {
  rank: bigint;
}

const MIN_QUIZZES_FOR_ELIGIBILITY = 3;
const PAGE_SIZE = 20;
const NEIGHBOR_WINDOW_SIZE = 5;

function toEntry(row: RawRankedRow): LeaderboardEntry {
  return {
    rank: Number(row.rank),
    userId: row.userId,
    displayName: row.displayName,
    totalScore: row.totalScore,
    averageAccuracy: row.averageAccuracy,
    quizzesCompleted: row.quizzesCompleted,
  };
}

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeaderboard(
    scope: LeaderboardScope,
    page: number,
    themeSlug?: string,
  ): Promise<{
    items: LeaderboardEntry[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }> {
    const scopeFilter = await this.buildScopeFilter(scope, themeSlug);
    const base = this.baseQuery(scopeFilter);

    const rows = await this.prisma.$queryRaw<RawRankedRow[]>`
      WITH ranked AS (
        SELECT base.*, ROW_NUMBER() OVER (
          ORDER BY "totalScore" DESC, "averageAccuracy" DESC, "createdAt" ASC
        ) AS rank
        FROM (${base}) base
      )
      SELECT "userId", "displayName", "totalScore", "quizzesCompleted", "averageAccuracy", rank
      FROM ranked
      ORDER BY rank
      LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}
    `;

    const totalResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count FROM (${base}) counted
    `;
    const total = Number(totalResult[0]?.count ?? 0n);

    return {
      items: rows.map(toEntry),
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  }

  /**
   * "Ma position" (claude.md §6.4) : rang global de l'utilisateur et ses
   * voisins, même hors de la première page.
   */
  async getMyRank(userId: string): Promise<MyRankResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (user?.excludedFromLeaderboard) {
      return { rank: null, totalEligible: 0, reason: 'opted-out', entries: [] };
    }

    const base = this.baseQuery(Prisma.empty);
    const rows = await this.prisma.$queryRaw<RawRankedRow[]>`
      WITH ranked AS (
        SELECT base.*, ROW_NUMBER() OVER (
          ORDER BY "totalScore" DESC, "averageAccuracy" DESC, "createdAt" ASC
        ) AS rank
        FROM (${base}) base
      )
      SELECT "userId", "displayName", "totalScore", "quizzesCompleted", "averageAccuracy", rank
      FROM ranked
      ORDER BY rank
    `;

    const totalEligible = rows.length;
    const myIndex = rows.findIndex((r) => r.userId === userId);

    if (myIndex === -1) {
      return { rank: null, totalEligible, reason: 'not-eligible', entries: [] };
    }

    const windowStart = Math.max(0, myIndex - 2);
    const windowEnd = Math.min(rows.length, windowStart + NEIGHBOR_WINDOW_SIZE);
    const adjustedStart = Math.max(0, windowEnd - NEIGHBOR_WINDOW_SIZE);

    return {
      rank: myIndex + 1,
      totalEligible,
      reason: null,
      entries: rows.slice(adjustedStart, windowEnd).map(toEntry),
    };
  }

  private async buildScopeFilter(scope: LeaderboardScope, themeSlug?: string): Promise<Prisma.Sql> {
    if (scope === 'theme') {
      if (!themeSlug) {
        throw new NotFoundException('themeSlug est requis pour scope=theme.');
      }
      const theme = await this.prisma.theme.findUnique({ where: { slug: themeSlug } });
      if (!theme) {
        throw new NotFoundException('Thème introuvable.');
      }
      return Prisma.sql`AND a.quiz_id IN (SELECT id FROM quizzes WHERE theme_id = ${theme.id}::uuid)`;
    }

    if (scope === '30d') {
      return Prisma.sql`AND a.finished_at >= NOW() - INTERVAL '30 days'`;
    }

    return Prisma.empty;
  }

  private baseQuery(scopeFilter: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`
      SELECT
        a.user_id AS "userId",
        u.display_name AS "displayName",
        u.created_at AS "createdAt",
        SUM(a.score)::int AS "totalScore",
        COUNT(DISTINCT a.id)::int AS "quizzesCompleted",
        CASE WHEN COUNT(aa.id) > 0
          THEN SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END)::float / COUNT(aa.id)
          ELSE 0
        END AS "averageAccuracy"
      FROM attempts a
      JOIN users u ON u.id = a.user_id
      LEFT JOIN attempt_answers aa ON aa.attempt_id = a.id
      WHERE a.counts_for_ranking = true
        AND a.finished_at IS NOT NULL
        AND a.user_id IS NOT NULL
        AND u.excluded_from_leaderboard = false
        AND u.deleted_at IS NULL
        ${scopeFilter}
      GROUP BY a.user_id, u.display_name, u.created_at
      HAVING COUNT(DISTINCT a.id) >= ${MIN_QUIZZES_FOR_ELIGIBILITY}
    `;
  }
}
