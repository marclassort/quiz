import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('pnpm stats:rebuild (e2e) — claude.md §6.4', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const suffix = randomUUID().slice(0, 8);
  let themeId: string;
  let quizId: string;
  let questionId: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get(PrismaService);

    const theme = await prisma.theme.create({
      data: { slug: `theme-rebuild-${suffix}`, name: 'Thème', description: 'd', position: 999 },
    });
    themeId = theme.id;

    const quiz = await prisma.quiz.create({
      data: {
        themeId,
        slug: `quiz-rebuild-${suffix}`,
        title: 'Quiz',
        description: 'd',
        difficulty: 'EASY',
        status: 'PUBLISHED',
        questionCount: 1,
      },
    });
    quizId = quiz.id;

    const question = await prisma.question.create({
      data: {
        quizId,
        position: 1,
        type: 'FREE_TEXT',
        statement: 'Q',
        explanation: 'E',
        source: 'S',
        acceptedAnswers: { create: [{ value: 'x', isPrimary: true }] },
      },
    });
    questionId = question.id;

    const user = await prisma.user.create({
      data: {
        email: `rebuild-${suffix}@example.com`,
        passwordHash: 'irrelevant',
        displayName: `Rebuild${suffix}`,
      },
    });
    userId = user.id;

    // Trois parties comptabilisées créées directement en base, "hors
    // process" normal (comme le ferait une restauration de sauvegarde) :
    // UserStats n'existe donc pas encore pour cet utilisateur -> dérive à
    // réparer par la commande CLI.
    for (let i = 0; i < 3; i++) {
      const attempt = await prisma.attempt.create({
        data: {
          quizId,
          userId,
          maxScore: 10,
          score: 10,
          countsForRanking: true,
          finishedAt: new Date(),
          startedAt: new Date(),
        },
      });
      await prisma.attemptAnswer.create({
        data: {
          attemptId: attempt.id,
          questionId,
          rawAnswer: {},
          isCorrect: true,
          pointsEarned: 10,
          answerTimeMs: 1000,
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.userStats.deleteMany({ where: { userId } });
    await prisma.attemptAnswer.deleteMany({ where: { attempt: { userId } } });
    await prisma.attempt.deleteMany({ where: { userId } });
    await prisma.question.deleteMany({ where: { quizId } });
    await prisma.quiz.deleteMany({ where: { id: quizId } });
    await prisma.theme.deleteMany({ where: { id: themeId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('répare la dérive : aucun UserStats avant, correct après `pnpm stats:rebuild`', async () => {
    const before = await prisma.userStats.findUnique({ where: { userId } });
    expect(before).toBeNull();

    execFileSync('pnpm', ['exec', 'tsx', 'scripts/rebuild-stats.ts'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'ignore',
    });

    const after = await prisma.userStats.findUniqueOrThrow({ where: { userId } });
    expect(after).toMatchObject({
      totalScore: 30,
      quizzesCompleted: 3,
      correctAnswers: 3,
      totalAnswers: 3,
      averageAccuracy: 1,
    });
  });
});
