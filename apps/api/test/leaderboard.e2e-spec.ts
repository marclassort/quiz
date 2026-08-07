import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';
import { ProblemDetailsFilter } from '../src/common/filters/problem-details.filter';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { TokenService } from '../src/auth/token.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Classement (e2e) — claude.md §6.4', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenService: TokenService;

  const suffix = randomUUID().slice(0, 8);
  const themeASlug = `theme-lb-a-${suffix}`;
  const themeBSlug = `theme-lb-b-${suffix}`;

  let themeAId: string;
  let themeBId: string;
  let quizAId: string;
  let quizBId: string;
  let questionAId: string;
  let questionBId: string;

  const userIds: Record<string, string> = {};

  async function createUser(displayName: string, createdAt: Date, excluded = false) {
    const user = await prisma.user.create({
      data: {
        email: `${displayName.toLowerCase()}-${suffix}@example.com`,
        passwordHash: 'irrelevant',
        displayName: `${displayName}${suffix}`,
        createdAt,
        excludedFromLeaderboard: excluded,
      },
    });
    userIds[displayName] = user.id;
    return user.id;
  }

  async function createAttempt(
    userId: string,
    quizId: string,
    questionId: string,
    score: number,
    isCorrect: boolean,
    finishedAt: Date,
    countsForRanking = true,
  ) {
    const attempt = await prisma.attempt.create({
      data: {
        quizId,
        userId,
        maxScore: score,
        score,
        countsForRanking,
        finishedAt,
        startedAt: finishedAt,
      },
    });
    await prisma.attemptAnswer.create({
      data: {
        attemptId: attempt.id,
        questionId,
        rawAnswer: {},
        isCorrect,
        pointsEarned: isCorrect ? score : 0,
        answerTimeMs: 1000,
      },
    });
    return attempt;
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
    tokenService = moduleFixture.get(TokenService);

    const themeA = await prisma.theme.create({
      data: { slug: themeASlug, name: 'Thème A', description: 'd', position: 998 },
    });
    themeAId = themeA.id;
    const themeB = await prisma.theme.create({
      data: { slug: themeBSlug, name: 'Thème B', description: 'd', position: 999 },
    });
    themeBId = themeB.id;

    const quizA = await prisma.quiz.create({
      data: {
        themeId: themeAId,
        slug: `quiz-lb-a-${suffix}`,
        title: 'Quiz A',
        description: 'd',
        difficulty: 'EASY',
        status: 'PUBLISHED',
        questionCount: 1,
      },
    });
    quizAId = quizA.id;
    const quizB = await prisma.quiz.create({
      data: {
        themeId: themeBId,
        slug: `quiz-lb-b-${suffix}`,
        title: 'Quiz B',
        description: 'd',
        difficulty: 'EASY',
        status: 'PUBLISHED',
        questionCount: 1,
      },
    });
    quizBId = quizB.id;

    const questionA = await prisma.question.create({
      data: {
        quizId: quizAId,
        position: 1,
        type: 'FREE_TEXT',
        statement: 'Q',
        explanation: 'E',
        source: 'S',
        acceptedAnswers: { create: [{ value: 'x', isPrimary: true }] },
      },
    });
    questionAId = questionA.id;
    const questionB = await prisma.question.create({
      data: {
        quizId: quizBId,
        position: 1,
        type: 'FREE_TEXT',
        statement: 'Q',
        explanation: 'E',
        source: 'S',
        acceptedAnswers: { create: [{ value: 'x', isPrimary: true }] },
      },
    });
    questionBId = questionB.id;

    const now = new Date();
    const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

    // --- Alice : 5 parties sur le thème A, très bon score, 100% de précision.
    const aliceId = await createUser('Alice', daysAgo(30));
    for (let i = 0; i < 5; i++) {
      await createAttempt(aliceId, quizAId, questionAId, 10, true, daysAgo(1));
    }
    // + 1 partie isolée sur le thème B (pas assez pour être éligible sur B seul).
    await createAttempt(aliceId, quizBId, questionBId, 5, true, daysAgo(1));

    // --- Bob : 3 parties thème A, score total 30, 100% de précision.
    const bobId = await createUser('Bob', daysAgo(20));
    for (let i = 0; i < 3; i++) {
      await createAttempt(bobId, quizAId, questionAId, 10, true, daysAgo(1));
    }

    // --- Carol : 3 parties thème A, même score total que Bob (30) mais 0%
    // de précision -> doit être départagée derrière Bob.
    const carolId = await createUser('Carol', daysAgo(10));
    for (let i = 0; i < 3; i++) {
      await createAttempt(carolId, quizAId, questionAId, 10, false, daysAgo(1));
    }

    // --- Dave : seulement 2 parties -> sous le seuil d'éligibilité (3).
    const daveId = await createUser('Dave', daysAgo(5));
    for (let i = 0; i < 2; i++) {
      await createAttempt(daveId, quizAId, questionAId, 100, true, daysAgo(1));
    }

    // --- Eve : 3 parties (éligible par le nombre) mais opt-out du classement.
    const eveId = await createUser('Eve', daysAgo(5), true);
    for (let i = 0; i < 3; i++) {
      await createAttempt(eveId, quizAId, questionAId, 5, true, daysAgo(1));
    }

    // --- Frank : 3 parties au total mais une seule dans la fenêtre des 30
    // jours -> éligible en global, pas en scope=30d.
    const frankId = await createUser('Frank', daysAgo(5));
    await createAttempt(frankId, quizAId, questionAId, 10, true, daysAgo(1));
    await createAttempt(frankId, quizAId, questionAId, 10, true, daysAgo(2));
    await createAttempt(frankId, quizAId, questionAId, 10, true, daysAgo(40));
  });

  afterAll(async () => {
    const ids = Object.values(userIds);
    await prisma.userStats.deleteMany({ where: { userId: { in: ids } } });
    await prisma.attemptAnswer.deleteMany({ where: { attempt: { userId: { in: ids } } } });
    await prisma.attempt.deleteMany({ where: { userId: { in: ids } } });
    await prisma.question.deleteMany({ where: { quizId: { in: [quizAId, quizBId] } } });
    await prisma.quiz.deleteMany({ where: { id: { in: [quizAId, quizBId] } } });
    await prisma.theme.deleteMany({ where: { id: { in: [themeAId, themeBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
    await app.close();
  });

  it('classement global : exclut sous le seuil de 3 quiz et les opt-out, départage par précision', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/leaderboard?scope=global');
    expect(response.status).toBe(200);

    const names = response.body.items.map((e: { displayName: string }) => e.displayName);
    expect(names).not.toContain(`Dave${suffix}`); // sous le seuil
    expect(names).not.toContain(`Eve${suffix}`); // opt-out

    const bobIndex = names.indexOf(`Bob${suffix}`);
    const carolIndex = names.indexOf(`Carol${suffix}`);
    expect(bobIndex).toBeGreaterThanOrEqual(0);
    expect(carolIndex).toBeGreaterThanOrEqual(0);
    expect(bobIndex).toBeLessThan(carolIndex); // même score, Bob a une meilleure précision

    const alice = response.body.items.find(
      (e: { displayName: string }) => e.displayName === `Alice${suffix}`,
    );
    expect(alice.rank).toBe(1);
    expect(alice.totalScore).toBe(55);
    expect(alice.quizzesCompleted).toBe(6);
  });

  it('classement par thème : ne compte que les parties du thème demandé', async () => {
    const response = await request(app.getHttpServer()).get(
      `/api/v1/leaderboard?scope=theme&themeSlug=${themeBSlug}`,
    );
    expect(response.status).toBe(200);
    // Alice n'a qu'une seule partie sur le thème B : sous le seuil de 3.
    expect(response.body.items).toHaveLength(0);
  });

  it('classement glissant 30 jours : exclut les parties trop anciennes de l’éligibilité', async () => {
    const globalResponse = await request(app.getHttpServer()).get(
      '/api/v1/leaderboard?scope=global',
    );
    const rolling = await request(app.getHttpServer()).get('/api/v1/leaderboard?scope=30d');

    const globalNames = globalResponse.body.items.map(
      (e: { displayName: string }) => e.displayName,
    );
    const rollingNames = rolling.body.items.map((e: { displayName: string }) => e.displayName);

    expect(globalNames).toContain(`Frank${suffix}`);
    expect(rollingNames).not.toContain(`Frank${suffix}`);
  });

  it('scope=theme sans themeSlug est rejeté (400)', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/leaderboard?scope=theme');
    expect(response.status).toBe(400);
  });

  it('GET /me/rank renvoie le rang et les voisins pour un utilisateur éligible', async () => {
    const token = tokenService.signAccessToken({ id: userIds.Alice!, role: 'USER' });
    const response = await request(app.getHttpServer())
      .get('/api/v1/me/rank')
      .set('Cookie', `access_token=${token}`);

    expect(response.status).toBe(200);
    expect(response.body.rank).toBe(1);
    expect(response.body.reason).toBeNull();
    expect(response.body.entries.length).toBeGreaterThan(0);
    expect(response.body.entries.some((e: { userId: string }) => e.userId === userIds.Alice)).toBe(
      true,
    );
  });

  it('GET /me/rank renvoie reason=not-eligible sous le seuil', async () => {
    const token = tokenService.signAccessToken({ id: userIds.Dave!, role: 'USER' });
    const response = await request(app.getHttpServer())
      .get('/api/v1/me/rank')
      .set('Cookie', `access_token=${token}`);

    expect(response.body).toMatchObject({ rank: null, reason: 'not-eligible', entries: [] });
  });

  it('GET /me/rank renvoie reason=opted-out pour un utilisateur exclu', async () => {
    const token = tokenService.signAccessToken({ id: userIds.Eve!, role: 'USER' });
    const response = await request(app.getHttpServer())
      .get('/api/v1/me/rank')
      .set('Cookie', `access_token=${token}`);

    expect(response.body).toMatchObject({ rank: null, reason: 'opted-out', entries: [] });
  });

  it('GET /me/rank exige une authentification', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/me/rank');
    expect(response.status).toBe(401);
  });
});
