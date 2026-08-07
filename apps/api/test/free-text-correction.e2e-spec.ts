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

describe('Correction FREE_TEXT (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const suffix = randomUUID().slice(0, 8);
  const quizSlug = `quiz-free-text-${suffix}`;
  let themeId: string;
  let quizId: string;
  let questionId: string;

  async function createAttemptAndAnswer(text: string) {
    const createResponse = await request(app.getHttpServer()).post(
      `/api/v1/quizzes/${quizSlug}/attempts`,
    );
    const guestToken = extractCookie(createResponse.headers['set-cookie'], 'guest_token');
    const cookieHeader = `guest_token=${guestToken}`;

    const answerResponse = await request(app.getHttpServer())
      .post(`/api/v1/attempts/${createResponse.body.attemptId}/answers`)
      .set('Cookie', cookieHeader)
      .send({ questionId, text });

    return answerResponse;
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

    const theme = await prisma.theme.create({
      data: { slug: `theme-ft-${suffix}`, name: 'Thème', description: 'd', position: 999 },
    });
    themeId = theme.id;

    const quiz = await prisma.quiz.create({
      data: {
        themeId,
        slug: quizSlug,
        title: 'Quiz FREE_TEXT',
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
        type: 'FREE_TEXT',
        statement: 'Quelle bataille napoléonienne de 1805 ?',
        explanation: 'La bataille d’Austerlitz, 2 décembre 1805.',
        source: 'Source test',
        points: 1,
        acceptedAnswers: {
          create: [
            { value: 'Austerlitz', isPrimary: true },
            { value: "bataille d'Austerlitz", isPrimary: false },
          ],
        },
      },
    });
    questionId = question.id;
  });

  afterAll(async () => {
    await prisma.attemptAnswer.deleteMany({ where: { questionId } });
    await prisma.attempt.deleteMany({ where: { quizId } });
    await prisma.answerReview.deleteMany({ where: { questionId } });
    await prisma.acceptedAnswer.deleteMany({ where: { questionId } });
    await prisma.question.deleteMany({ where: { quizId } });
    await prisma.quiz.deleteMany({ where: { id: quizId } });
    await prisma.theme.deleteMany({ where: { id: themeId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('accepte une correspondance exacte après normalisation (casse, espaces, article)', async () => {
    const response = await createAttemptAndAnswer('  la bataille D’Austerlitz  ');
    expect(response.body.isCorrect).toBe(true);
  });

  it('accepte une faute de frappe tolérée par Levenshtein', async () => {
    const response = await createAttemptAndAnswer('Austerlitzz');
    expect(response.body.isCorrect).toBe(true);
  });

  it('rejette une réponse fausse et l’enregistre dans AnswerReview', async () => {
    const uniqueWrongAnswer = `Waterloo-${suffix}`;
    const response = await createAttemptAndAnswer(uniqueWrongAnswer);

    expect(response.body.isCorrect).toBe(false);
    expect(response.body.correctAnswer).toBe('Austerlitz');

    const review = await prisma.answerReview.findFirst({
      where: { questionId, submittedText: uniqueWrongAnswer },
    });
    expect(review).not.toBeNull();
    expect(review?.occurrences).toBe(1);
    expect(review?.status).toBe('PENDING');
  });

  it('cumule les occurrences pour la même faute soumise à nouveau (casse différente)', async () => {
    const uniqueWrongAnswer = `Marengo-${suffix}`;

    await createAttemptAndAnswer(uniqueWrongAnswer);
    await createAttemptAndAnswer(uniqueWrongAnswer.toUpperCase());

    const reviews = await prisma.answerReview.findMany({
      where: { questionId, submittedText: { contains: `Marengo-${suffix}`, mode: 'insensitive' } },
    });
    expect(reviews).toHaveLength(1);
    expect(reviews[0]?.occurrences).toBe(2);
  });
});
