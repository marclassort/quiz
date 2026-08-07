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

describe('Catalogue + partie anonyme (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const suffix = randomUUID().slice(0, 8);
  const themeSlug = `theme-test-${suffix}`;
  const quizSlug = `quiz-test-${suffix}`;
  const draftQuizSlug = `quiz-draft-test-${suffix}`;

  let themeId: string;
  let quizId: string;
  let draftQuizId: string;
  let choiceQuestionId: string;
  let correctChoiceId: string;
  let wrongChoiceId: string;
  let freeTextQuestionId: string;

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
      data: { slug: themeSlug, name: 'Thème test', description: 'desc', position: 999 },
    });
    themeId = theme.id;

    const quiz = await prisma.quiz.create({
      data: {
        themeId,
        slug: quizSlug,
        title: 'Quiz test',
        description: 'desc',
        difficulty: 'EASY',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        questionCount: 2,
      },
    });
    quizId = quiz.id;

    const draftQuiz = await prisma.quiz.create({
      data: {
        themeId,
        slug: draftQuizSlug,
        title: 'Quiz brouillon',
        description: 'desc',
        difficulty: 'EASY',
        status: 'DRAFT',
      },
    });
    draftQuizId = draftQuiz.id;

    const choiceQuestion = await prisma.question.create({
      data: {
        quizId,
        position: 1,
        type: 'SINGLE_CHOICE',
        statement: 'En quelle année a eu lieu la bataille d’Austerlitz ?',
        explanation: 'Austerlitz a eu lieu le 2 décembre 1805.',
        source: 'Source test',
        points: 2,
        choices: {
          create: [
            { position: 1, label: '1805', isCorrect: true },
            { position: 2, label: '1810', isCorrect: false },
            { position: 3, label: '1815', isCorrect: false },
          ],
        },
      },
      include: { choices: true },
    });
    choiceQuestionId = choiceQuestion.id;
    correctChoiceId = choiceQuestion.choices.find((c) => c.isCorrect)!.id;
    wrongChoiceId = choiceQuestion.choices.find((c) => !c.isCorrect)!.id;

    const freeTextQuestion = await prisma.question.create({
      data: {
        quizId,
        position: 2,
        type: 'FREE_TEXT',
        statement: 'Quel général a été vaincu à Austerlitz aux côtés des Russes ?',
        explanation: "François II d'Autriche.",
        source: 'Source test',
        points: 1,
        acceptedAnswers: {
          create: [
            { value: 'François II', isPrimary: true },
            { value: 'François II d’Autriche', isPrimary: false },
          ],
        },
      },
    });
    freeTextQuestionId = freeTextQuestion.id;
  });

  afterAll(async () => {
    await prisma.attemptAnswer.deleteMany({ where: { question: { quizId } } });
    await prisma.attempt.deleteMany({ where: { quizId } });
    await prisma.choice.deleteMany({ where: { questionId: choiceQuestionId } });
    await prisma.acceptedAnswer.deleteMany({ where: { questionId: freeTextQuestionId } });
    await prisma.question.deleteMany({ where: { quizId } });
    await prisma.quiz.deleteMany({ where: { id: { in: [quizId, draftQuizId] } } });
    await prisma.theme.deleteMany({ where: { id: themeId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('GET /themes liste le thème publié', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/themes');
    expect(response.status).toBe(200);
    expect(response.body.some((t: { slug: string }) => t.slug === themeSlug)).toBe(true);
  });

  it('GET /quizzes ne liste que les quizzes PUBLISHED', async () => {
    const response = await request(app.getHttpServer()).get(`/api/v1/quizzes?theme=${themeSlug}`);
    expect(response.status).toBe(200);
    const slugs = response.body.items.map((q: { slug: string }) => q.slug);
    expect(slugs).toContain(quizSlug);
    expect(slugs).not.toContain(draftQuizSlug);
  });

  it('GET /quizzes/:slug renvoie 404 pour un quiz DRAFT', async () => {
    const response = await request(app.getHttpServer()).get(`/api/v1/quizzes/${draftQuizSlug}`);
    expect(response.status).toBe(404);
  });

  it('parcours complet anonyme : création, questions, réponses, fin de partie', async () => {
    const createResponse = await request(app.getHttpServer()).post(
      `/api/v1/quizzes/${quizSlug}/attempts`,
    );
    expect(createResponse.status).toBe(201);
    const guestTokenCookie = extractCookie(createResponse.headers['set-cookie'], 'guest_token');
    expect(guestTokenCookie).toBeTruthy();

    const attemptId = createResponse.body.attemptId;
    expect(attemptId).toBeTruthy();
    expect(createResponse.body.question.id).toBe(choiceQuestionId);
    expect(createResponse.body.question.choices).toHaveLength(3);
    for (const choice of createResponse.body.question.choices) {
      expect(choice.isCorrect).toBeUndefined();
    }

    const cookieHeader = `guest_token=${guestTokenCookie}`;

    // Une autre identité (autre guestToken) ne peut pas accéder à cette partie.
    const strangerResponse = await request(app.getHttpServer())
      .get(`/api/v1/attempts/${attemptId}/questions/current`)
      .set('Cookie', `guest_token=${randomUUID()}`);
    expect(strangerResponse.status).toBe(403);

    const currentResponse = await request(app.getHttpServer())
      .get(`/api/v1/attempts/${attemptId}/questions/current`)
      .set('Cookie', cookieHeader);
    expect(currentResponse.status).toBe(200);
    expect(currentResponse.body.question.id).toBe(choiceQuestionId);

    const wrongAnswerResponse = await request(app.getHttpServer())
      .post(`/api/v1/attempts/${attemptId}/answers`)
      .set('Cookie', cookieHeader)
      .send({ questionId: choiceQuestionId, choiceIds: [wrongChoiceId] });
    expect(wrongAnswerResponse.status).toBe(201);
    expect(wrongAnswerResponse.body.isCorrect).toBe(false);
    expect(wrongAnswerResponse.body.pointsEarned).toBe(0);

    // Une question déjà répondue ne peut pas être resoumise (claude.md §6.1).
    const duplicateResponse = await request(app.getHttpServer())
      .post(`/api/v1/attempts/${attemptId}/answers`)
      .set('Cookie', cookieHeader)
      .send({ questionId: choiceQuestionId, choiceIds: [correctChoiceId] });
    expect(duplicateResponse.status).toBe(409);

    const freeTextResponse = await request(app.getHttpServer())
      .post(`/api/v1/attempts/${attemptId}/answers`)
      .set('Cookie', cookieHeader)
      .send({ questionId: freeTextQuestionId, text: '  françois ii  ' });
    expect(freeTextResponse.status).toBe(201);
    expect(freeTextResponse.body.isCorrect).toBe(true);
    expect(freeTextResponse.body.pointsEarned).toBe(1);
    expect(freeTextResponse.body.nextQuestionId).toBeNull();

    const completedResponse = await request(app.getHttpServer())
      .get(`/api/v1/attempts/${attemptId}/questions/current`)
      .set('Cookie', cookieHeader);
    expect(completedResponse.body).toEqual({
      attemptId,
      question: null,
      completed: true,
    });

    const finishResponse = await request(app.getHttpServer())
      .post(`/api/v1/attempts/${attemptId}/finish`)
      .set('Cookie', cookieHeader);
    expect(finishResponse.status).toBe(201);
    expect(finishResponse.body).toMatchObject({
      score: 1,
      maxScore: 3,
      countsForRanking: true,
      correctAnswers: 1,
      totalAnswers: 2,
    });
    expect(finishResponse.body.durationMs).toBeGreaterThanOrEqual(0);

    // Un second essai du même invité sur le même quiz passe en mode entraînement.
    const secondAttemptResponse = await request(app.getHttpServer())
      .post(`/api/v1/quizzes/${quizSlug}/attempts`)
      .set('Cookie', cookieHeader);
    const secondAttempt = await prisma.attempt.findUniqueOrThrow({
      where: { id: secondAttemptResponse.body.attemptId },
    });
    expect(secondAttempt.countsForRanking).toBe(false);
  });
});
