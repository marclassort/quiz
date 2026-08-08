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

/**
 * quality.md : "un test dédié vérifiant qu'aucune réponse d'API publique ne
 * contient isCorrect, targetLat, targetLng, un featureIds attendu ou une
 * AcceptedAnswer." Ce fichier couvre la partie cartographique du parcours,
 * quiz-play.e2e-spec.ts couvrant déjà les questions classiques.
 */
describe('Partie cartographique (e2e) — non-fuite MAP_CLICK/MAP_PLACE', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const suffix = randomUUID().slice(0, 8);
  const themeSlug = `theme-geo-test-${suffix}`;
  const quizSlug = `quiz-geo-test-${suffix}`;
  const datasetSlug = `dataset-test-${suffix}`;

  let themeId: string;
  let quizId: string;
  let datasetId: string;
  let mapClickQuestionId: string;
  let mapPlaceQuestionId: string;

  const targetLat = 48.8566;
  const targetLng = 2.3522;
  const toleranceKm = 50;

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
      data: { slug: themeSlug, name: 'Thème géo test', description: 'desc', position: 999 },
    });
    themeId = theme.id;

    const dataset = await prisma.geoDataset.create({
      data: {
        slug: datasetSlug,
        name: 'Dataset test',
        kind: 'COUNTRY',
        scope: 'world',
        sourceName: 'Source test',
        sourceUrl: 'https://example.com',
        license: 'Public Domain',
        attributionText: 'Attribution test',
        version: 'v1',
      },
    });
    datasetId = dataset.id;

    const quiz = await prisma.quiz.create({
      data: {
        themeId,
        slug: quizSlug,
        title: 'Quiz géo test',
        description: 'desc',
        difficulty: 'EASY',
        gameMode: 'GEO',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        questionCount: 2,
      },
    });
    quizId = quiz.id;

    const mapClickQuestion = await prisma.question.create({
      data: {
        quizId,
        position: 1,
        type: 'MAP_CLICK',
        statement: 'Cliquez sur la France',
        explanation: 'La France est en Europe de l’Ouest.',
        source: 'Source test',
        points: 2,
        payload: {
          datasetId,
          datasetVersion: 'v1',
          featureIds: ['FRA'],
          prompt: 'Cliquez sur la France',
          distractorPolicy: 'ALL_FEATURES',
        },
      },
    });
    mapClickQuestionId = mapClickQuestion.id;

    const mapPlaceQuestion = await prisma.question.create({
      data: {
        quizId,
        position: 2,
        type: 'MAP_PLACE',
        statement: 'Placez Paris',
        explanation: 'Paris est la capitale de la France.',
        source: 'Source test',
        points: 10,
        payload: {
          datasetId,
          datasetVersion: 'v1',
          targetLat,
          targetLng,
          toleranceKm,
          scoringCurve: 'LINEAR',
        },
      },
    });
    mapPlaceQuestionId = mapPlaceQuestion.id;
  });

  afterAll(async () => {
    await prisma.attemptAnswer.deleteMany({ where: { question: { quizId } } });
    await prisma.attempt.deleteMany({ where: { quizId } });
    await prisma.question.deleteMany({ where: { quizId } });
    await prisma.quiz.deleteMany({ where: { id: quizId } });
    await prisma.geoDataset.deleteMany({ where: { id: datasetId } });
    await prisma.theme.deleteMany({ where: { id: themeId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('GET /geo/datasets/:slug renvoie les métadonnées et l’attribution', async () => {
    const response = await request(app.getHttpServer()).get(
      `/api/v1/geo/datasets/${datasetSlug}`,
    );
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      slug: datasetSlug,
      attributionText: 'Attribution test',
      version: 'v1',
    });
  });

  it('parcours complet : question MAP_CLICK puis MAP_PLACE, sans fuite', async () => {
    const createResponse = await request(app.getHttpServer()).post(
      `/api/v1/quizzes/${quizSlug}/attempts`,
    );
    expect(createResponse.status).toBe(201);
    const guestTokenCookie = extractCookie(createResponse.headers['set-cookie'], 'guest_token');
    const cookieHeader = `guest_token=${guestTokenCookie}`;
    const attemptId = createResponse.body.attemptId;

    // Non-fuite sur la réponse de création : ni featureIds, ni target*.
    const createBodyText = JSON.stringify(createResponse.body);
    expect(createBodyText).not.toContain('featureIds');
    expect(createBodyText).not.toContain('targetLat');
    expect(createBodyText).not.toContain('targetLng');
    expect(createResponse.body.question.type).toBe('MAP_CLICK');
    expect(createResponse.body.question.payload).toMatchObject({
      datasetSlug,
      datasetVersion: 'v1',
      prompt: 'Cliquez sur la France',
    });
    // datasetId (uuid interne) n'est plus exposé publiquement, seul le slug l'est.
    expect(createResponse.body.question.payload.datasetId).toBeUndefined();

    const currentResponse = await request(app.getHttpServer())
      .get(`/api/v1/attempts/${attemptId}/questions/current`)
      .set('Cookie', cookieHeader);
    const currentBodyText = JSON.stringify(currentResponse.body);
    expect(currentBodyText).not.toContain('featureIds');
    expect(currentBodyText).not.toContain('targetLat');
    expect(currentBodyText).not.toContain('targetLng');

    // Mauvaise feature : incorrect, 0 point.
    const wrongClickResponse = await request(app.getHttpServer())
      .post(`/api/v1/attempts/${attemptId}/answers`)
      .set('Cookie', cookieHeader)
      .send({ questionId: mapClickQuestionId, featureId: 'DEU' });
    expect(wrongClickResponse.status).toBe(201);
    expect(wrongClickResponse.body.isCorrect).toBe(false);
    expect(wrongClickResponse.body.pointsEarned).toBe(0);
    // La correction, elle, révèle bien la bonne réponse (comportement voulu
    // après soumission — la non-fuite ne s'applique qu'avant).
    expect(wrongClickResponse.body.correctAnswer).toContain('FRA');

    // Une question déjà répondue ne peut pas être resoumise.
    const duplicateResponse = await request(app.getHttpServer())
      .post(`/api/v1/attempts/${attemptId}/answers`)
      .set('Cookie', cookieHeader)
      .send({ questionId: mapClickQuestionId, featureId: 'FRA' });
    expect(duplicateResponse.status).toBe(409);

    const nextResponse = await request(app.getHttpServer())
      .get(`/api/v1/attempts/${attemptId}/questions/current`)
      .set('Cookie', cookieHeader);
    expect(nextResponse.body.question.type).toBe('MAP_PLACE');
    expect(nextResponse.body.question.payload).toMatchObject({
      datasetSlug,
      datasetVersion: 'v1',
      toleranceKm,
      scoringCurve: 'LINEAR',
    });
    expect(nextResponse.body.question.payload.datasetId).toBeUndefined();
    const nextBodyText = JSON.stringify(nextResponse.body);
    expect(nextBodyText).not.toContain('targetLat');
    expect(nextBodyText).not.toContain('targetLng');

    // Placement à ~25 km de la cible (mi-tolérance) : score dégressif attendu.
    const placeResponse = await request(app.getHttpServer())
      .post(`/api/v1/attempts/${attemptId}/answers`)
      .set('Cookie', cookieHeader)
      .send({ questionId: mapPlaceQuestionId, lat: targetLat + 25 / 111, lng: targetLng });
    expect(placeResponse.status).toBe(201);
    expect(placeResponse.body.isCorrect).toBe(true);
    expect(placeResponse.body.pointsEarned).toBe(5); // 10 points × (1 - 25/50)
    expect(placeResponse.body.distanceKm).toBeCloseTo(25, 0);

    const finishResponse = await request(app.getHttpServer())
      .post(`/api/v1/attempts/${attemptId}/finish`)
      .set('Cookie', cookieHeader);
    expect(finishResponse.body).toMatchObject({ score: 5, maxScore: 12, correctAnswers: 1 });
  });

  it('rejette une réponse MAP_PLACE sans lat/lng', async () => {
    const createResponse = await request(app.getHttpServer()).post(
      `/api/v1/quizzes/${quizSlug}/attempts`,
    );
    const guestTokenCookie = extractCookie(createResponse.headers['set-cookie'], 'guest_token');
    const cookieHeader = `guest_token=${guestTokenCookie}`;
    const attemptId = createResponse.body.attemptId;

    await request(app.getHttpServer())
      .post(`/api/v1/attempts/${attemptId}/answers`)
      .set('Cookie', cookieHeader)
      .send({ questionId: mapClickQuestionId, featureId: 'FRA' });

    const response = await request(app.getHttpServer())
      .post(`/api/v1/attempts/${attemptId}/answers`)
      .set('Cookie', cookieHeader)
      .send({ questionId: mapPlaceQuestionId, text: 'Paris' });
    expect(response.status).toBe(400);

    await prisma.attemptAnswer.deleteMany({ where: { attemptId } });
    await prisma.attempt.deleteMany({ where: { id: attemptId } });
  });
});
