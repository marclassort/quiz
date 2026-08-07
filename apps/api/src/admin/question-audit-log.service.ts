import { Injectable } from '@nestjs/common';

import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Journal des modifications sur les questions publiées (claude.md §9).
 * `quizPublishedAt` est passé par l'appelant (qui a déjà chargé la question
 * et son quiz) plutôt que rechargé ici, pour éviter une requête
 * supplémentaire. Ne couvre que création/modification : la suppression
 * d'une question entraîne la suppression en cascade de son propre journal
 * (FK `onDelete: Cascade`), donc un événement "deleted" n'aurait de toute
 * façon rien à survivre à consulter.
 */
@Injectable()
export class QuestionAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    questionId: string,
    changedBy: string,
    action: 'created' | 'updated',
    quizPublishedAt: Date | null,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (!quizPublishedAt) {
      return;
    }

    const client = tx ?? this.prisma;
    await client.questionAuditLogEntry.create({
      data: { questionId, changedBy, action },
    });
  }
}
