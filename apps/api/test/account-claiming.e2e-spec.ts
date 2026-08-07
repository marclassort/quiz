import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';
import { ProblemDetailsFilter } from '../src/common/filters/problem-details.filter';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

function extractCookie(
  setCookieHeader: string | string[] | undefined,
  name: string,
): string | undefined {
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : (setCookieHeader?.split(', ') ?? []);
  const line = cookies.find((c) => c.startsWith(`${name}=`));
  return line?.split(';')[0]?.split('=')[1];
}

describe('Rattachement de compte (e2e) — claude.md §4.3', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const suffix = randomUUID().slice(0, 8);
  const email = `claim-test-${suffix}@example.com`;
  const password = 'un-mot-de-passe-vraiment-solide-42';
  let themeId: string;
  let quizId: string;
  let quizSlug: string;
  let questionId: string;
  let correctChoiceId: string;
  let guestAttemptId: string;
  let guestTokenCookie: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    const theme = await prisma.theme.create({
      data: { slug: `theme-claim-${suffix}`, name: 'Thème', description: 'd', position: 999 },
    });
    themeId = theme.id;

    quizSlug = `quiz-claim-${suffix}`;
    const quiz = await prisma.quiz.create({
      data: {
        themeId,
        slug: quizSlug,
        title: 'Quiz claim',
        description: 'd',
        difficulty: 'EASY',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        questionCount: 1,
      },
    });
    quizId = quiz.id;

    const question = await prisma.question.create({
      data: {
        quizId,
        position: 1,
        type: 'SINGLE_CHOICE',
        statement: 'Question',
        explanation: 'Explication',
        source: 'Source test',
        points: 3,
        choices: { create: [{ position: 1, label: 'Bonne réponse', isCorrect: true }] },
      },
      include: { choices: true },
    });
    questionId = question.id;
    correctChoiceId = question.choices[0]!.id;
  });

  afterAll(async () => {
    await prisma.userStats.deleteMany({ where: { userId } });
    await prisma.attemptAnswer.deleteMany({ where: { question: { quizId } } });
    await prisma.attempt.deleteMany({ where: { quizId } });
    await prisma.choice.deleteMany({ where: { questionId } });
    await prisma.question.deleteMany({ where: { quizId } });
    await prisma.quiz.deleteMany({ where: { id: quizId } });
    await prisma.theme.deleteMany({ where: { id: themeId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('joue anonymement une partie complète (guestToken)', async () => {
    const createResponse = await request(app.getHttpServer()).post(
      `/api/v1/quizzes/${quizSlug}/attempts`,
    );
    guestAttemptId = createResponse.body.attemptId;
    guestTokenCookie = extractCookie(createResponse.headers['set-cookie'], 'guest_token')!;
    expect(guestTokenCookie).toBeTruthy();

    const cookieHeader = `guest_token=${guestTokenCookie}`;
    const answerResponse = await request(app.getHttpServer())
      .post(`/api/v1/attempts/${guestAttemptId}/answers`)
      .set('Cookie', cookieHeader)
      .send({ questionId, choiceIds: [correctChoiceId] });
    expect(answerResponse.body.isCorrect).toBe(true);

    const finishResponse = await request(app.getHttpServer())
      .post(`/api/v1/attempts/${guestAttemptId}/finish`)
      .set('Cookie', cookieHeader);
    expect(finishResponse.body).toMatchObject({ score: 3, countsForRanking: true });

    const attempt = await prisma.attempt.findUniqueOrThrow({ where: { id: guestAttemptId } });
    expect(attempt.guestToken).toBe(guestTokenCookie);
    expect(attempt.userId).toBeNull();
  });

  it("s'inscrit avec le cookie invité : la partie est rattachée et UserStats recalculé", async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('Cookie', `guest_token=${guestTokenCookie}`)
      .send({ email, password, displayName: `ClaimTest${suffix}` });
    expect(registerResponse.status).toBe(201);
    userId = registerResponse.body.user.id;

    // Le cookie invité n'a plus lieu d'être une fois le compte créé.
    const clearedGuestCookie = (
      Array.isArray(registerResponse.headers['set-cookie'])
        ? registerResponse.headers['set-cookie']
        : [registerResponse.headers['set-cookie']]
    ).find((c: string) => c?.startsWith('guest_token='));
    expect(clearedGuestCookie).toMatch(/guest_token=;/);

    const attempt = await prisma.attempt.findUniqueOrThrow({ where: { id: guestAttemptId } });
    expect(attempt.userId).toBe(userId);
    expect(attempt.guestToken).toBeNull();

    const stats = await prisma.userStats.findUniqueOrThrow({ where: { userId } });
    expect(stats).toMatchObject({
      totalScore: 3,
      quizzesCompleted: 1,
      correctAnswers: 1,
      totalAnswers: 1,
      averageAccuracy: 1,
    });
  });

  it('la bascule est idempotente : le même guestToken ne rattache plus rien ensuite', async () => {
    const stillOrphaned = await prisma.attempt.count({ where: { guestToken: guestTokenCookie } });
    expect(stillOrphaned).toBe(0);

    // Simule une seconde tentative de rattachement avec le même token (ex.
    // cookie navigateur non nettoyé) : ne doit rien modifier.
    const { count } = await prisma.attempt.updateMany({
      where: { guestToken: guestTokenCookie },
      data: { userId, guestToken: null },
    });
    expect(count).toBe(0);
  });
});
