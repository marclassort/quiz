import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';
import { ProblemDetailsFilter } from '../src/common/filters/problem-details.filter';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('/me (e2e) — claude.md §7, §11', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const suffix = randomUUID().slice(0, 8);
  const email = `me-test-${suffix}@example.com`;
  const password = 'un-mot-de-passe-vraiment-solide-42';
  const displayName = `MeTest${suffix}`;

  let userId: string;
  let accessTokenCookie: string;
  let themeId: string;
  let quizId: string;
  let quizSlug: string;
  let questionId: string;
  let correctChoiceId: string;

  function extractCookie(setCookieHeader: string | string[] | undefined, name: string) {
    const cookies = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : (setCookieHeader?.split(', ') ?? []);
    return cookies
      .find((c) => c.startsWith(`${name}=`))
      ?.split(';')[0]
      ?.split('=')[1];
  }

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
      .send({ email, password, displayName });
    userId = registerResponse.body.user.id;
    accessTokenCookie = extractCookie(registerResponse.headers['set-cookie'], 'access_token')!;

    const theme = await prisma.theme.create({
      data: { slug: `theme-me-${suffix}`, name: 'Thème', description: 'd', position: 999 },
    });
    themeId = theme.id;

    quizSlug = `quiz-me-${suffix}`;
    const quiz = await prisma.quiz.create({
      data: {
        themeId,
        slug: quizSlug,
        title: 'Quiz me',
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
        statement: 'Q',
        explanation: 'E',
        source: 'S',
        points: 4,
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
    await prisma.userStats.deleteMany({ where: { userId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('GET /me sans authentification renvoie 401', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/me');
    expect(response.status).toBe(401);
  });

  it('GET /me renvoie le profil, y compris son propre email', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', `access_token=${accessTokenCookie}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: userId,
      email,
      displayName,
      role: 'USER',
      excludedFromLeaderboard: false,
    });
  });

  it('PATCH /me met à jour displayName et excludedFromLeaderboard', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set('Cookie', `access_token=${accessTokenCookie}`)
      .send({ displayName: `${displayName}Updated`, excludedFromLeaderboard: true });

    expect(response.status).toBe(200);
    expect(response.body.displayName).toBe(`${displayName}Updated`);
    expect(response.body.excludedFromLeaderboard).toBe(true);

    // Remet l'état initial pour la suite des tests.
    await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set('Cookie', `access_token=${accessTokenCookie}`)
      .send({ displayName, excludedFromLeaderboard: false });
  });

  it('PATCH /me rejette un corps vide (aucun champ à mettre à jour)', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set('Cookie', `access_token=${accessTokenCookie}`)
      .send({});
    expect(response.status).toBe(400);
  });

  it('joue une partie complète pour peupler /me/attempts et /me/stats', async () => {
    const createResponse = await request(app.getHttpServer())
      .post(`/api/v1/quizzes/${quizSlug}/attempts`)
      .set('Cookie', `access_token=${accessTokenCookie}`);
    const attemptId = createResponse.body.attemptId;

    await request(app.getHttpServer())
      .post(`/api/v1/attempts/${attemptId}/answers`)
      .set('Cookie', `access_token=${accessTokenCookie}`)
      .send({ questionId, choiceIds: [correctChoiceId] });

    await request(app.getHttpServer())
      .post(`/api/v1/attempts/${attemptId}/finish`)
      .set('Cookie', `access_token=${accessTokenCookie}`);
  });

  it('GET /me/attempts liste la partie jouée', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/me/attempts')
      .set('Cookie', `access_token=${accessTokenCookie}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({ quizSlug, score: 4, maxScore: 4 });
  });

  it('GET /me/stats reflète la partie jouée', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/me/stats')
      .set('Cookie', `access_token=${accessTokenCookie}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      totalScore: 4,
      quizzesCompleted: 1,
      correctAnswers: 1,
      totalAnswers: 1,
      averageAccuracy: 1,
    });
  });

  it('GET /me/export renvoie un JSON téléchargeable avec profil, stats et parties', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/me/export')
      .set('Cookie', `access_token=${accessTokenCookie}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.body.user.id).toBe(userId);
    expect(response.body.stats.totalScore).toBe(4);
    expect(response.body.attempts).toHaveLength(1);
    expect(response.body.attempts[0].answers).toHaveLength(1);
  });

  it('DELETE /me anonymise les Attempt, supprime les données personnelles, et clôt la session', async () => {
    const attemptsBefore = await prisma.attempt.findMany({ where: { userId } });
    expect(attemptsBefore).toHaveLength(1);
    const attemptId = attemptsBefore[0]!.id;

    const response = await request(app.getHttpServer())
      .delete('/api/v1/me')
      .set('Cookie', `access_token=${accessTokenCookie}`);
    expect(response.status).toBe(204);

    // Cookies de session effacés.
    const setCookies = Array.isArray(response.headers['set-cookie'])
      ? response.headers['set-cookie']
      : [response.headers['set-cookie']];
    expect(setCookies.some((c: string) => c?.startsWith('access_token=;'))).toBe(true);

    // L'Attempt survit (statistiques agrégées conservées) mais n'est plus
    // rattaché à personne, et respecte toujours la contrainte XOR.
    const attemptAfter = await prisma.attempt.findUniqueOrThrow({ where: { id: attemptId } });
    expect(attemptAfter.userId).toBeNull();
    expect(attemptAfter.guestToken).not.toBeNull();
    expect(attemptAfter.score).toBe(4); // les données agrégées (score) sont conservées

    // Les données personnelles ont disparu du compte.
    const userAfter = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(userAfter.deletedAt).not.toBeNull();
    expect(userAfter.email).not.toBe(email);
    expect(userAfter.displayName).not.toContain(displayName);

    // UserStats personnel disparaît (n'a plus de sens sans identité).
    const statsAfter = await prisma.userStats.findUnique({ where: { userId } });
    expect(statsAfter).toBeNull();

    // Le compte est désormais injoignable : le JwtStrategy rejette déjà les
    // utilisateurs soft-deleted au niveau du guard (401), avant même
    // d'atteindre le contrôleur.
    const meAfterDelete = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', `access_token=${accessTokenCookie}`);
    expect(meAfterDelete.status).toBe(401);
  });
});
