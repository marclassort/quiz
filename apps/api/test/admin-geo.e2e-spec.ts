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

describe('Admin — datasets géographiques et payload de question (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenService: TokenService;

  const suffix = randomUUID().slice(0, 8);
  const datasetSlug = `admin-dataset-test-${suffix}`;

  let adminId: string;
  let adminCookie: string;
  let themeId: string;
  let quizId: string;
  let mapClickQuestionId: string;
  let datasetId: string;

  function auth(cookie: string) {
    return `access_token=${cookie}`;
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

    const admin = await prisma.user.create({
      data: {
        email: `admin-geo-${suffix}@example.com`,
        passwordHash: 'irrelevant',
        displayName: `AdminGeo${suffix}`,
        role: 'ADMIN',
      },
    });
    adminId = admin.id;
    adminCookie = tokenService.signAccessToken({ id: adminId, role: 'ADMIN' });

    const theme = await prisma.theme.create({
      data: { slug: `theme-admin-geo-${suffix}`, name: 'Thème', description: 'd', position: 999 },
    });
    themeId = theme.id;

    const quiz = await prisma.quiz.create({
      data: {
        themeId,
        slug: `quiz-admin-geo-${suffix}`,
        title: 'Quiz',
        description: 'd',
        difficulty: 'EASY',
        gameMode: 'GEO',
      },
    });
    quizId = quiz.id;

    const question = await prisma.question.create({
      data: {
        quizId,
        position: 1,
        type: 'MAP_CLICK',
        statement: 'Cliquez sur la France',
        explanation: 'e',
        source: 's',
      },
    });
    mapClickQuestionId = question.id;
  });

  afterAll(async () => {
    await prisma.question.deleteMany({ where: { quizId } });
    await prisma.quiz.deleteMany({ where: { id: quizId } });
    await prisma.theme.deleteMany({ where: { id: themeId } });
    await prisma.geoDataset.deleteMany({ where: { id: datasetId } });
    await prisma.user.deleteMany({ where: { id: adminId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('POST /admin/geo-datasets crée un dataset', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/admin/geo-datasets')
      .set('Cookie', auth(adminCookie))
      .send({
        slug: datasetSlug,
        name: 'Pays du monde (test)',
        kind: 'COUNTRY',
        scope: 'world',
        sourceName: 'Natural Earth',
        sourceUrl: 'https://www.naturalearthdata.com/',
        license: 'Public Domain',
        attributionText: 'Natural Earth (domaine public).',
        version: 'v1',
      });
    expect(response.status).toBe(201);
    datasetId = response.body.id;
    expect(response.body.slug).toBe(datasetSlug);
  });

  it('GET /admin/geo-datasets liste les datasets', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/geo-datasets')
      .set('Cookie', auth(adminCookie));
    expect(response.status).toBe(200);
    expect(response.body.some((d: { slug: string }) => d.slug === datasetSlug)).toBe(true);
  });

  it('un non-admin reçoit 403 sur /admin/geo-datasets', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/admin/geo-datasets');
    expect(response.status).toBe(401);
  });

  it('PUT /admin/questions/:id/payload valide, dérive datasetVersion et enregistre', async () => {
    const response = await request(app.getHttpServer())
      .put(`/api/v1/admin/questions/${mapClickQuestionId}/payload`)
      .set('Cookie', auth(adminCookie))
      .send({
        payload: {
          datasetId,
          featureIds: ['FRA'],
          prompt: 'Cliquez sur la France',
          distractorPolicy: 'ALL_FEATURES',
        },
      });
    expect(response.status).toBe(200);
    expect(response.body.payload).toMatchObject({
      datasetId,
      datasetVersion: 'v1', // dérivé du GeoDataset, pas fourni par l'admin
      featureIds: ['FRA'],
    });
  });

  it('PUT .../payload rejette un datasetId inexistant', async () => {
    const response = await request(app.getHttpServer())
      .put(`/api/v1/admin/questions/${mapClickQuestionId}/payload`)
      .set('Cookie', auth(adminCookie))
      .send({
        payload: {
          datasetId: randomUUID(),
          featureIds: ['FRA'],
          prompt: 'x',
          distractorPolicy: 'ALL_FEATURES',
        },
      });
    expect(response.status).toBe(404);
  });

  it('PUT .../payload rejette une forme invalide (featureIds vide)', async () => {
    const response = await request(app.getHttpServer())
      .put(`/api/v1/admin/questions/${mapClickQuestionId}/payload`)
      .set('Cookie', auth(adminCookie))
      .send({
        payload: { datasetId, featureIds: [], prompt: 'x', distractorPolicy: 'ALL_FEATURES' },
      });
    expect(response.status).toBe(400);
  });

  it('PUT .../payload rejette sur une question sans payload (type classique)', async () => {
    const classicQuestion = await prisma.question.create({
      data: {
        quizId,
        position: 2,
        type: 'SINGLE_CHOICE',
        statement: 'x',
        explanation: 'e',
        source: 's',
      },
    });
    const response = await request(app.getHttpServer())
      .put(`/api/v1/admin/questions/${classicQuestion.id}/payload`)
      .set('Cookie', auth(adminCookie))
      .send({
        payload: { datasetId, featureIds: ['FRA'], prompt: 'x', distractorPolicy: 'ALL_FEATURES' },
      });
    expect(response.status).toBe(400);
    await prisma.question.deleteMany({ where: { id: classicQuestion.id } });
  });
});
