import { randomUUID } from 'node:crypto';

import { Test, TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Modèle de données Prisma (e2e)', () => {
  let prisma: PrismaService;
  let themeId: string;
  let quizId: string;
  let questionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleFixture.get(PrismaService);

    const theme = await prisma.theme.create({
      data: { slug: 'periode-napoleonienne-test', name: 'Test', description: 'Test', position: 1 },
    });
    themeId = theme.id;

    const quiz = await prisma.quiz.create({
      data: {
        themeId,
        slug: 'quiz-test',
        title: 'Quiz test',
        description: 'Test',
        difficulty: 'EASY',
        status: 'DRAFT',
      },
    });
    quizId = quiz.id;

    const question = await prisma.question.create({
      data: {
        quizId,
        position: 1,
        type: 'SINGLE_CHOICE',
        statement: 'En quelle année a eu lieu la bataille d’Austerlitz ?',
        explanation: 'Explication test',
        source: 'Source test',
        choices: {
          create: [
            { position: 1, label: '1805', isCorrect: true },
            { position: 2, label: '1810', isCorrect: false },
          ],
        },
      },
    });
    questionId = question.id;
  });

  afterAll(async () => {
    await prisma.attemptAnswer.deleteMany({ where: { questionId } });
    await prisma.attempt.deleteMany({ where: { quizId } });
    await prisma.choice.deleteMany({ where: { questionId } });
    await prisma.question.deleteMany({ where: { quizId } });
    await prisma.quiz.deleteMany({ where: { id: quizId } });
    await prisma.theme.deleteMany({ where: { id: themeId } });
    await prisma.$disconnect();
  });

  it('crée un Attempt anonyme (guestToken) lié au quiz et à sa question', async () => {
    const attempt = await prisma.attempt.create({
      data: { quizId, guestToken: randomUUID(), maxScore: 1 },
    });

    const answer = await prisma.attemptAnswer.create({
      data: {
        attemptId: attempt.id,
        questionId,
        rawAnswer: { choiceIds: ['some-choice-id'] },
        isCorrect: true,
        pointsEarned: 1,
        answerTimeMs: 1200,
      },
    });

    expect(answer.attemptId).toBe(attempt.id);
  });

  it('rejette un Attempt sans userId ni guestToken (contrainte XOR)', async () => {
    await expect(prisma.attempt.create({ data: { quizId, maxScore: 1 } })).rejects.toThrow();
  });

  it('rejette une seconde réponse à la même question dans le même Attempt', async () => {
    const attempt = await prisma.attempt.create({
      data: { quizId, guestToken: randomUUID(), maxScore: 1 },
    });

    const answerData = {
      attemptId: attempt.id,
      questionId,
      rawAnswer: { choiceIds: ['some-choice-id'] },
      isCorrect: true,
      pointsEarned: 1,
      answerTimeMs: 1000,
    };

    await prisma.attemptAnswer.create({ data: answerData });

    await expect(prisma.attemptAnswer.create({ data: answerData })).rejects.toThrow();
  });
});
