import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { normalizeFreeText } from './free-text-correction/normalize';

@Injectable()
export class AnswerReviewService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * claude.md §6.3 point 4 : réponse FREE_TEXT non reconnue -> enregistrée
   * dans AnswerReview pour permettre à l'admin de l'accepter en un clic
   * (lot 6g). Les occurrences se cumulent sur les révisions PENDING
   * équivalentes une fois normalisées (une même faute tapée différemment en
   * casse/espaces ne crée pas deux entrées) ; une révision déjà tranchée
   * (ACCEPTED/REJECTED) n'accumule plus — une nouvelle soumission identique
   * rouvre une entrée PENDING fraîche.
   */
  async recordFailedFreeTextAnswer(questionId: string, rawSubmittedText: string): Promise<void> {
    const normalizedSubmission = normalizeFreeText(rawSubmittedText);

    const pendingReviews = await this.prisma.answerReview.findMany({
      where: { questionId, status: 'PENDING' },
    });
    const existing = pendingReviews.find(
      (review) => normalizeFreeText(review.submittedText) === normalizedSubmission,
    );

    if (existing) {
      await this.prisma.answerReview.update({
        where: { id: existing.id },
        data: { occurrences: { increment: 1 } },
      });
      return;
    }

    await this.prisma.answerReview.create({
      data: { questionId, submittedText: rawSubmittedText.trim() },
    });
  }
}
