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

describe('Partie authentifiée + bonus de rapidité (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const suffix = randomUUID().slice(0, 8);
  const email = `quiz-play-auth-${suffix}@example.com`;
  const password = 'un-mot-de-passe-vraiment-solide-99';

  let themeId: string;
  let quizId: string;
  let quizSlug: string;
  let questionId: string;
  let correctChoiceId: string;
  let userId: string;
  let accessTokenCookie: string;

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

    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, displayName: `AuthPlay${suffix}` });
    userId = registerResponse.body.user.id;
    accessTokenCookie = extractCookie(registerResponse.headers['set-cookie'], 'access_token')!;

    const theme = await prisma.theme.create({
      data: { slug: `theme-auth-play-${suffix}`, name: 'Thème', description: 'd', position: 999 },
    });
    themeId = theme.id;

    quizSlug = `quiz-speed-bonus-${suffix}`;
    const quiz = await prisma.quiz.create({
      data: {
        themeId,
        slug: quizSlug,
        title: 'Quiz bonus de rapidité',
        description: 'd',
        difficulty: 'EASY',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        questionCount: 1,
        speedBonusEnabled: true,
        timeLimitSeconds: 30, // 1 question -> budget 30s, tiers = 10s
      },
    });
    quizId = quiz.id;

    const question = await prisma.question.create({
      data: {
        quizId,
        position: 1,
        type: 'SINGLE_CHOICE',
        statement: 'Question rapide',
        explanation: 'Explication',
        source: 'Source test',
        points: 2,
        choices: { create: [{ position: 1, label: 'Bonne réponse', isCorrect: true }] },
      },
      include: { choices: true },
    });
    questionId = question.id;
    correctChoiceId = question.choices[0]!.id;
  });

  afterAll(async () => {
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

  it("l'Attempt d'un utilisateur connecté porte userId, pas guestToken", async () => {
    const createResponse = await request(app.getHttpServer())
      .post(`/api/v1/quizzes/${quizSlug}/attempts`)
      .set('Cookie', `access_token=${accessTokenCookie}`);
    expect(createResponse.status).toBe(201);

    const attempt = await prisma.attempt.findUniqueOrThrow({
      where: { id: createResponse.body.attemptId },
    });
    expect(attempt.userId).toBe(userId);
    expect(attempt.guestToken).toBeNull();
  });

  it('applique le bonus de rapidité (+50%) si répondu en moins d’un tiers du temps imparti', async () => {
    const createResponse = await request(app.getHttpServer())
      .post(`/api/v1/quizzes/${quizSlug}/attempts`)
      .set('Cookie', `access_token=${accessTokenCookie}`);
    const attemptId = createResponse.body.attemptId;

    const answerResponse = await request(app.getHttpServer())
      .post(`/api/v1/attempts/${attemptId}/answers`)
      .set('Cookie', `access_token=${accessTokenCookie}`)
      .send({ questionId, choiceIds: [correctChoiceId] });

    expect(answerResponse.status).toBe(201);
    expect(answerResponse.body.isCorrect).toBe(true);
    // 2 points de base, réponse quasi instantanée (< 10s = un tiers de 30s) -> bonus 1.5x -> 3.
    expect(answerResponse.body.pointsEarned).toBe(3);
  });
});
