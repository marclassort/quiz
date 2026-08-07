import {
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

import { Prisma } from '../generated/prisma/client';
import type { QuestionModel as Question } from '../generated/prisma/models';
import { PrismaService } from '../prisma/prisma.service';
import { QuizzesService } from '../quizzes/quizzes.service';
import { UserStatsService } from '../user-stats/user-stats.service';
import { AnswerReviewService } from './answer-review.service';
import { shuffleForAttempt } from './choice-shuffle';
import { matchFreeTextAnswer } from './free-text-correction/matcher';
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

    const { isCorrect, correctAnswer } = await this.evaluateAnswer(question, input);

    const pointsEarned = computePointsEarned(
      isCorrect,
      question.points,
      {
        speedBonusEnabled: quiz.speedBonusEnabled,
        timeLimitSeconds: quiz.timeLimitSeconds,
        questionCountInQuiz: quiz.questionCount,
      },
      answerTimeMs,
    );

    try {
      await this.prisma.$transaction([
        this.prisma.attemptAnswer.create({
          data: {
            attemptId,
            questionId: question.id,
            rawAnswer: (input.choiceIds
              ? { choiceIds: input.choiceIds }
              : { text: input.text }) as Prisma.InputJsonValue,
            isCorrect,
            pointsEarned,
            answerTimeMs,
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

    if (question.type !== 'FREE_TEXT') {
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
    };
  }

  private async evaluateAnswer(
    question: Question & {
      choices: { id: string; isCorrect: boolean; label: string }[];
      acceptedAnswers: { value: string; isPrimary: boolean }[];
    },
    input: SubmitAnswerInput,
  ): Promise<{ isCorrect: boolean; correctAnswer: string | string[] }> {
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
