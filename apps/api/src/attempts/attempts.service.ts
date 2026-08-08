import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AnswerResult,
  CurrentQuestionResponse,
  FinishResult,
  PublicChoice,
  PublicQuestion,
  SubmitAnswerInput,
} from '@quiz/shared';
import {
  mapClickPayloadSchema,
  mapPlacePayloadSchema,
  publicMapClickPayloadSchema,
  publicMapPlacePayloadSchema,
} from '@quiz/shared';

import { Prisma } from '../generated/prisma/client';
import type { QuestionModel as Question } from '../generated/prisma/models';
import { PrismaService } from '../prisma/prisma.service';
import { QuizzesService } from '../quizzes/quizzes.service';
import { UserStatsService } from '../user-stats/user-stats.service';
import { AnswerReviewService } from './answer-review.service';
import { shuffleForAttempt } from './choice-shuffle';
import { matchFreeTextAnswer } from './free-text-correction/matcher';
import { computeMapPlaceResult, isFeatureClickCorrect } from './geo-scoring';
import type { Identity } from './identity';
import { computePointsEarned, isChoiceSelectionCorrect } from './scoring';

@Injectable()
export class AttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quizzesService: QuizzesService,
    private readonly answerReviewService: AnswerReviewService,
    private readonly userStatsService: UserStatsService,
  ) {}

  async createAttempt(quizSlug: string, identity: Identity): Promise<CurrentQuestionResponse> {
    const quiz = await this.quizzesService.getPublishedQuizEntityBySlug(quizSlug);

    const maxScoreResult = await this.prisma.question.aggregate({
      where: { quizId: quiz.id },
      _sum: { points: true },
    });
    const maxScore = maxScoreResult._sum.points ?? 0;

    const priorFinishedAttempt = await this.prisma.attempt.findFirst({
      where: {
        quizId: quiz.id,
        finishedAt: { not: null },
        ...(identity.userId ? { userId: identity.userId } : { guestToken: identity.guestToken }),
      },
    });

    const attempt = await this.prisma.attempt.create({
      data: {
        quizId: quiz.id,
        userId: identity.userId,
        guestToken: identity.userId ? undefined : identity.guestToken,
        maxScore,
        countsForRanking: !priorFinishedAttempt,
      },
    });

    return this.buildCurrentQuestionResponse(attempt.id, quiz.id);
  }

  async getCurrentQuestion(
    attemptId: string,
    identity: Identity,
  ): Promise<CurrentQuestionResponse> {
    const attempt = await this.findAttemptOrThrow(attemptId);
    this.assertOwnership(attempt, identity);

    if (attempt.finishedAt !== null) {
      return { attemptId, question: null, completed: true };
    }

    return this.buildCurrentQuestionResponse(attemptId, attempt.quizId);
  }

  async submitAnswer(
    attemptId: string,
    identity: Identity,
    input: SubmitAnswerInput,
  ): Promise<AnswerResult> {
    const attempt = await this.findAttemptOrThrow(attemptId);
    this.assertOwnership(attempt, identity);

    if (attempt.finishedAt !== null) {
      throw new ConflictException('Cette partie est déjà terminée.');
    }

    const question = await this.prisma.question.findFirst({
      where: { id: input.questionId, quizId: attempt.quizId },
      include: { choices: true, acceptedAnswers: true },
    });

    if (!question) {
      throw new NotFoundException("Cette question n'appartient pas à ce quiz.");
    }

    const quiz = await this.prisma.quiz.findUniqueOrThrow({ where: { id: attempt.quizId } });

    const lastAnswer = await this.prisma.attemptAnswer.findFirst({
      where: { attemptId },
      orderBy: { submittedAt: 'desc' },
    });
    const referenceStart = lastAnswer?.submittedAt ?? attempt.startedAt;
    const answerTimeMs = Math.max(0, Date.now() - referenceStart.getTime());

    const {
      isCorrect,
      correctAnswer,
      distanceKm,
      datasetVersion,
      pointsEarned: geoPointsEarned,
    } = await this.evaluateAnswer(question, input);

    // MAP_PLACE porte son propre score dégressif à la distance
    // (docs/SCORING.md) : pas de bonus de rapidité, pas de calcul standard.
    const pointsEarned =
      geoPointsEarned ??
      computePointsEarned(
        isCorrect,
        question.points,
        {
          speedBonusEnabled: quiz.speedBonusEnabled,
          timeLimitSeconds: quiz.timeLimitSeconds,
          questionCountInQuiz: quiz.questionCount,
        },
        answerTimeMs,
      );

    const rawAnswer: Prisma.InputJsonValue = input.choiceIds
      ? { choiceIds: input.choiceIds }
      : input.featureId !== undefined
        ? { featureId: input.featureId }
        : input.lat !== undefined && input.lng !== undefined
          ? { lat: input.lat, lng: input.lng }
          : { text: input.text };

    try {
      await this.prisma.$transaction([
        this.prisma.attemptAnswer.create({
          data: {
            attemptId,
            questionId: question.id,
            rawAnswer,
            isCorrect,
            pointsEarned,
            answerTimeMs,
            datasetVersion,
          },
        }),
        this.prisma.attempt.update({
          where: { id: attemptId },
          data: { score: { increment: pointsEarned } },
        }),
      ]);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Cette question a déjà reçu une réponse pour cette partie.');
      }
      throw error;
    }

    const nextQuestion = await this.prisma.question.findFirst({
      where: {
        quizId: attempt.quizId,
        id: { notIn: [question.id] },
        NOT: { attemptAnswers: { some: { attemptId } } },
      },
      orderBy: { position: 'asc' },
    });

    return {
      isCorrect,
      correctAnswer,
      explanation: question.explanation,
      pointsEarned,
      distanceKm,
      nextQuestionId: nextQuestion?.id ?? null,
    };
  }

  async finish(attemptId: string, identity: Identity): Promise<FinishResult> {
    const attempt = await this.findAttemptOrThrow(attemptId);
    this.assertOwnership(attempt, identity);

    let finishedAttempt = attempt;
    if (attempt.finishedAt === null) {
      const durationMs = Date.now() - attempt.startedAt.getTime();

      finishedAttempt = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.attempt.update({
          where: { id: attemptId },
          data: { finishedAt: new Date(), durationMs },
        });

        // claude.md §6.4 : UserStats mis à jour de façon transactionnelle à
        // la fin de chaque Attempt comptabilisé.
        if (updated.userId && updated.countsForRanking) {
          await this.userStatsService.recomputeForUser(updated.userId, tx);
        }

        return updated;
      });
    }

    const answerStats = await this.prisma.attemptAnswer.aggregate({
      where: { attemptId },
      _count: { _all: true },
    });
    const correctAnswersCount = await this.prisma.attemptAnswer.count({
      where: { attemptId, isCorrect: true },
    });

    return {
      score: finishedAttempt.score,
      maxScore: finishedAttempt.maxScore,
      durationMs: finishedAttempt.durationMs ?? 0,
      countsForRanking: finishedAttempt.countsForRanking,
      correctAnswers: correctAnswersCount,
      totalAnswers: answerStats._count._all,
    };
  }

  private async findAttemptOrThrow(attemptId: string) {
    const attempt = await this.prisma.attempt.findUnique({ where: { id: attemptId } });
    if (!attempt) {
      throw new NotFoundException('Partie introuvable.');
    }
    return attempt;
  }

  private assertOwnership(
    attempt: { userId: string | null; guestToken: string | null },
    identity: Identity,
  ): void {
    if (attempt.userId) {
      if (attempt.userId !== identity.userId) {
        throw new ForbiddenException();
      }
      return;
    }

    if (!identity.guestToken || attempt.guestToken !== identity.guestToken) {
      throw new ForbiddenException();
    }
  }

  private async buildCurrentQuestionResponse(
    attemptId: string,
    quizId: string,
  ): Promise<CurrentQuestionResponse> {
    const answeredQuestions = await this.prisma.attemptAnswer.findMany({
      where: { attemptId },
      select: { questionId: true },
    });

    const question = await this.prisma.question.findFirst({
      where: { quizId, id: { notIn: answeredQuestions.map((a) => a.questionId) } },
      orderBy: { position: 'asc' },
    });

    if (!question) {
      return { attemptId, question: null, completed: true };
    }

    return {
      attemptId,
      question: await this.toPublicQuestion(attemptId, question),
      completed: false,
    };
  }

  private async toPublicQuestion(attemptId: string, question: Question): Promise<PublicQuestion> {
    let choices: PublicChoice[] = [];
    let payload: PublicQuestion['payload'] = null;

    if (question.type === 'MAP_CLICK') {
      const fullPayload = mapClickPayloadSchema.parse(question.payload);
      const datasetSlug = await this.resolveDatasetSlug(fullPayload.datasetId);
      // Le payload admin (avec featureIds) n'est jamais construit dans une
      // variable exposée telle quelle : .parse() par le schéma public
      // dépouille structurellement les champs sensibles (claude.md §4).
      payload = publicMapClickPayloadSchema.parse({ ...fullPayload, datasetSlug });
    } else if (question.type === 'MAP_PLACE') {
      const fullPayload = mapPlacePayloadSchema.parse(question.payload);
      const datasetSlug = await this.resolveDatasetSlug(fullPayload.datasetId);
      payload = publicMapPlacePayloadSchema.parse({ ...fullPayload, datasetSlug });
    } else if (question.type !== 'FREE_TEXT') {
      const rawChoices = await this.prisma.choice.findMany({
        where: { questionId: question.id },
        orderBy: { position: 'asc' },
      });
      choices = shuffleForAttempt(attemptId, rawChoices).map((choice) => ({
        id: choice.id,
        position: choice.position,
        label: choice.label,
      }));
    }

    return {
      id: question.id,
      position: question.position,
      type: question.type,
      statement: question.statement,
      imageUrl: question.imageUrl,
      points: question.points,
      choices,
      payload,
    };
  }

  /**
   * Le payload stocké ne porte que `datasetId` (clé étrangère réelle) ; le
   * client a besoin du slug pour construire l'URL du TopoJSON statique
   * (apps/web/public/geo/<slug>/<version>.topojson) sans aller-retour
   * supplémentaire — résolu ici plutôt que côté client.
   */
  private async resolveDatasetSlug(datasetId: string): Promise<string> {
    const dataset = await this.prisma.geoDataset.findUniqueOrThrow({ where: { id: datasetId } });
    return dataset.slug;
  }

  private async evaluateAnswer(
    question: Question & {
      choices: { id: string; isCorrect: boolean; label: string }[];
      acceptedAnswers: { value: string; isPrimary: boolean }[];
    },
    input: SubmitAnswerInput,
  ): Promise<{
    isCorrect: boolean;
    correctAnswer: string | string[];
    distanceKm?: number;
    datasetVersion?: string;
    /**
     * Fourni uniquement par MAP_PLACE : score dégressif selon la distance
     * (docs/SCORING.md), qui remplace entièrement le calcul standard
     * tout-ou-rien ± bonus de rapidité de computePointsEarned — pas de bonus
     * de rapidité sur MAP_PLACE, cf. docs/SCORING.md.
     */
    pointsEarned?: number;
  }> {
    if (question.type === 'MAP_CLICK') {
      if (input.featureId === undefined) {
        throw new BadRequestException('Cette question attend un featureId.');
      }
      const payload = mapClickPayloadSchema.parse(question.payload);
      const isCorrect = isFeatureClickCorrect(payload.featureIds, input.featureId);
      return {
        isCorrect,
        correctAnswer: payload.featureIds,
        datasetVersion: payload.datasetVersion,
      };
    }

    if (question.type === 'MAP_PLACE') {
      if (input.lat === undefined || input.lng === undefined) {
        throw new BadRequestException('Cette question attend lat et lng.');
      }
      const payload = mapPlacePayloadSchema.parse(question.payload);
      const { isCorrect, distanceKm, pointsEarned } = computeMapPlaceResult(
        { lat: payload.targetLat, lng: payload.targetLng },
        { lat: input.lat, lng: input.lng },
        payload.toleranceKm,
        question.points,
      );
      return {
        isCorrect,
        correctAnswer: `${payload.targetLat}, ${payload.targetLng}`,
        distanceKm,
        datasetVersion: payload.datasetVersion,
        pointsEarned,
      };
    }

    if (question.type === 'FREE_TEXT') {
      const submittedText = input.text ?? '';
      const { isCorrect } = matchFreeTextAnswer(
        submittedText,
        question.acceptedAnswers.map((a) => a.value),
      );

      if (!isCorrect) {
        await this.answerReviewService.recordFailedFreeTextAnswer(question.id, submittedText);
      }

      const primary =
        question.acceptedAnswers.find((a) => a.isPrimary) ?? question.acceptedAnswers[0];
      return { isCorrect, correctAnswer: primary?.value ?? '' };
    }

    const correctChoices = question.choices.filter((c) => c.isCorrect);
    const correctChoiceIds = new Set(correctChoices.map((c) => c.id));
    const isCorrect = isChoiceSelectionCorrect(correctChoiceIds, input.choiceIds ?? []);

    return { isCorrect, correctAnswer: correctChoices.map((c) => c.label) };
  }
}
