import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminQuestionListQuery,
  CreateAcceptedAnswerInput,
  CreateChoiceInput,
  CreateQuestionInput,
  ReorderChoicesInput,
  UpdateAcceptedAnswerInput,
  UpdateChoiceInput,
  UpdateQuestionInput,
} from '@quiz/shared';

import { normalizeFreeText } from '../../attempts/free-text-correction/normalize';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QuestionAuditLogService } from '../question-audit-log.service';

const PAGE_SIZE = 20;

interface SuccessRate {
  totalAnswers: number;
  correctAnswers: number;
  successRate: number;
}

@Injectable()
export class AdminQuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: QuestionAuditLogService,
  ) {}

  async findAll(query: AdminQuestionListQuery) {
    const where: Prisma.QuestionWhereInput = {
      ...(query.quizId ? { quizId: query.quizId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search ? { statement: { contains: query.search, mode: 'insensitive' } } : {}),
      ...(query.theme || query.status
        ? {
            quiz: {
              ...(query.theme ? { theme: { slug: query.theme } } : {}),
              ...(query.status ? { status: query.status } : {}),
            },
          }
        : {}),
    };

    const [questions, total] = await this.prisma.$transaction([
      this.prisma.question.findMany({
        where,
        include: { quiz: { select: { slug: true, title: true, status: true } } },
        orderBy: [{ quizId: 'asc' }, { position: 'asc' }],
        skip: (query.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.question.count({ where }),
    ]);

    const successRates = await this.computeSuccessRates(questions.map((q) => q.id));

    return {
      items: questions.map((question) => ({ ...question, ...successRates[question.id] })),
      page: query.page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  }

  async findOne(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        quiz: { select: { slug: true, title: true, status: true } },
        choices: { orderBy: { position: 'asc' } },
        acceptedAnswers: true,
      },
    });
    if (!question) {
      throw new NotFoundException('Question introuvable.');
    }
    const rates = await this.computeSuccessRates([id]);
    return { ...question, ...rates[id] };
  }

  async create(input: CreateQuestionInput, adminUserId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: input.quizId } });
    if (!quiz) {
      throw new NotFoundException('Quiz introuvable.');
    }

    return this.prisma.$transaction(async (tx) => {
      const question = await tx.question.create({ data: input });
      await tx.quiz.update({ where: { id: quiz.id }, data: { questionCount: { increment: 1 } } });
      await this.auditLogService.record(question.id, adminUserId, 'created', quiz.publishedAt, tx);
      return question;
    });
  }

  async update(id: string, input: UpdateQuestionInput, adminUserId: string) {
    const question = await this.findOneWithQuiz(id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.question.update({ where: { id }, data: input });
      await this.auditLogService.record(id, adminUserId, 'updated', question.quiz.publishedAt, tx);
      return updated;
    });
  }

  async remove(id: string): Promise<void> {
    const question = await this.findOneWithQuiz(id);
    try {
      await this.prisma.$transaction([
        this.prisma.question.delete({ where: { id } }),
        this.prisma.quiz.update({
          where: { id: question.quizId },
          data: { questionCount: { decrement: 1 } },
        }),
      ]);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'Cette question a déjà reçu des réponses en partie : elle ne peut plus être supprimée.',
        );
      }
      throw error;
    }
  }

  async listChoices(questionId: string) {
    await this.findOneWithQuiz(questionId);
    return this.prisma.choice.findMany({ where: { questionId }, orderBy: { position: 'asc' } });
  }

  async createChoice(questionId: string, input: CreateChoiceInput, adminUserId: string) {
    const question = await this.findOneWithQuiz(questionId);
    return this.prisma.$transaction(async (tx) => {
      const choice = await tx.choice.create({ data: { questionId, ...input } });
      await this.auditLogService.record(
        questionId,
        adminUserId,
        'updated',
        question.quiz.publishedAt,
        tx,
      );
      return choice;
    });
  }

  async updateChoice(
    questionId: string,
    choiceId: string,
    input: UpdateChoiceInput,
    adminUserId: string,
  ) {
    const question = await this.findOneWithQuiz(questionId);
    await this.findChoiceOrThrow(questionId, choiceId);

    return this.prisma.$transaction(async (tx) => {
      const choice = await tx.choice.update({ where: { id: choiceId }, data: input });
      await this.auditLogService.record(
        questionId,
        adminUserId,
        'updated',
        question.quiz.publishedAt,
        tx,
      );
      return choice;
    });
  }

  async removeChoice(questionId: string, choiceId: string, adminUserId: string): Promise<void> {
    const question = await this.findOneWithQuiz(questionId);
    await this.findChoiceOrThrow(questionId, choiceId);

    await this.prisma.$transaction(async (tx) => {
      await tx.choice.delete({ where: { id: choiceId } });
      await this.auditLogService.record(
        questionId,
        adminUserId,
        'updated',
        question.quiz.publishedAt,
        tx,
      );
    });
  }

  /** claude.md §9 : "choix multiples avec réordonnancement". */
  async reorderChoices(questionId: string, input: ReorderChoicesInput, adminUserId: string) {
    const question = await this.findOneWithQuiz(questionId);
    const existingChoices = await this.prisma.choice.findMany({ where: { questionId } });
    const existingIds = new Set(existingChoices.map((c) => c.id));

    const isValidReorder =
      input.orderedChoiceIds.length === existingChoices.length &&
      input.orderedChoiceIds.every((id) => existingIds.has(id));
    if (!isValidReorder) {
      throw new BadRequestException(
        'La liste doit contenir exactement les identifiants des choix existants de cette question.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const [index, choiceId] of input.orderedChoiceIds.entries()) {
        await tx.choice.update({ where: { id: choiceId }, data: { position: index + 1 } });
      }
      await this.auditLogService.record(
        questionId,
        adminUserId,
        'updated',
        question.quiz.publishedAt,
        tx,
      );
    });

    return this.prisma.choice.findMany({ where: { questionId }, orderBy: { position: 'asc' } });
  }

  /** claude.md §9 : "Journal des modifications (qui a modifié quoi, quand)
   * sur les questions publiées." Écrit par QuestionAuditLogService.record()
   * (uniquement lorsque le quiz est déjà publié) ; lu ici pour le back-office. */
  async listAuditLog(questionId: string) {
    await this.findOneWithQuiz(questionId);
    const entries = await this.prisma.questionAuditLogEntry.findMany({
      where: { questionId },
      include: { admin: { select: { displayName: true } } },
      orderBy: { changedAt: 'desc' },
    });
    return entries.map((entry) => ({
      id: entry.id,
      action: entry.action,
      changedAt: entry.changedAt.toISOString(),
      changedByDisplayName: entry.admin?.displayName ?? null,
    }));
  }

  /** claude.md §9 : "aperçu de la normalisation appliquée" — l'admin doit voir
   * ce que le moteur de correction (lot 6c) comparera réellement. */
  async listAcceptedAnswers(questionId: string) {
    await this.findOneWithQuiz(questionId);
    const answers = await this.prisma.acceptedAnswer.findMany({ where: { questionId } });
    return answers.map((answer) => ({
      ...answer,
      normalizedValue: normalizeFreeText(answer.value),
    }));
  }

  async createAcceptedAnswer(
    questionId: string,
    input: CreateAcceptedAnswerInput,
    adminUserId: string,
  ) {
    const question = await this.findOneWithQuiz(questionId);
    const answer = await this.prisma.$transaction(async (tx) => {
      const created = await tx.acceptedAnswer.create({
        data: { questionId, value: input.value, isPrimary: input.isPrimary ?? false },
      });
      await this.auditLogService.record(
        questionId,
        adminUserId,
        'updated',
        question.quiz.publishedAt,
        tx,
      );
      return created;
    });
    return { ...answer, normalizedValue: normalizeFreeText(answer.value) };
  }

  async updateAcceptedAnswer(
    questionId: string,
    answerId: string,
    input: UpdateAcceptedAnswerInput,
    adminUserId: string,
  ) {
    const question = await this.findOneWithQuiz(questionId);
    await this.findAcceptedAnswerOrThrow(questionId, answerId);

    const answer = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.acceptedAnswer.update({ where: { id: answerId }, data: input });
      await this.auditLogService.record(
        questionId,
        adminUserId,
        'updated',
        question.quiz.publishedAt,
        tx,
      );
      return updated;
    });
    return { ...answer, normalizedValue: normalizeFreeText(answer.value) };
  }

  async removeAcceptedAnswer(
    questionId: string,
    answerId: string,
    adminUserId: string,
  ): Promise<void> {
    const question = await this.findOneWithQuiz(questionId);
    await this.findAcceptedAnswerOrThrow(questionId, answerId);

    await this.prisma.$transaction(async (tx) => {
      await tx.acceptedAnswer.delete({ where: { id: answerId } });
      await this.auditLogService.record(
        questionId,
        adminUserId,
        'updated',
        question.quiz.publishedAt,
        tx,
      );
    });
  }

  private async computeSuccessRates(questionIds: string[]): Promise<Record<string, SuccessRate>> {
    const base: Record<string, SuccessRate> = {};
    for (const id of questionIds) {
      base[id] = { totalAnswers: 0, correctAnswers: 0, successRate: 0 };
    }
    if (questionIds.length === 0) {
      return base;
    }

    const rows = await this.prisma.$queryRaw<
      { questionId: string; total: bigint; correct: bigint }[]
    >`
      SELECT question_id AS "questionId",
        COUNT(*) AS total,
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS correct
      FROM attempt_answers
      WHERE question_id = ANY(${questionIds}::uuid[])
      GROUP BY question_id
    `;

    for (const row of rows) {
      const total = Number(row.total);
      const correct = Number(row.correct);
      base[row.questionId] = {
        totalAnswers: total,
        correctAnswers: correct,
        successRate: total > 0 ? correct / total : 0,
      };
    }
    return base;
  }

  private async findOneWithQuiz(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: { quiz: true },
    });
    if (!question) {
      throw new NotFoundException('Question introuvable.');
    }
    return question;
  }

  private async findChoiceOrThrow(questionId: string, choiceId: string) {
    const choice = await this.prisma.choice.findFirst({ where: { id: choiceId, questionId } });
    if (!choice) {
      throw new NotFoundException('Choix introuvable.');
    }
    return choice;
  }

  private async findAcceptedAnswerOrThrow(questionId: string, answerId: string) {
    const answer = await this.prisma.acceptedAnswer.findFirst({
      where: { id: answerId, questionId },
    });
    if (!answer) {
      throw new NotFoundException('Réponse acceptée introuvable.');
    }
    return answer;
  }
}
