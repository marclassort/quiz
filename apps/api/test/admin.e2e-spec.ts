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

describe('Back-office admin (e2e) — claude.md §7 admin, §9', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenService: TokenService;

  const suffix = randomUUID().slice(0, 8);
  let adminId: string;
  let adminCookie: string;
  let userId: string;
  let userCookie: string;

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
        email: `admin-${suffix}@example.com`,
        passwordHash: 'irrelevant',
        displayName: `Admin${suffix}`,
        role: 'ADMIN',
      },
    });
    adminId = admin.id;
    adminCookie = tokenService.signAccessToken({ id: adminId, role: 'ADMIN' });

    const user = await prisma.user.create({
      data: {
        email: `user-${suffix}@example.com`,
        passwordHash: 'irrelevant',
        displayName: `User${suffix}`,
      },
    });
    userId = user.id;
    userCookie = tokenService.signAccessToken({ id: userId, role: 'USER' });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [adminId, userId] } } });
    await prisma.$disconnect();
    await app.close();
  });

  it('un utilisateur non-admin reçoit 403 sur les routes /admin', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/themes')
      .set('Cookie', auth(userCookie));
    expect(response.status).toBe(403);
  });

  it('une requête non authentifiée reçoit 401', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/admin/themes');
    expect(response.status).toBe(401);
  });

  describe('CRUD thèmes/quizzes/questions + publication + prévisualisation', () => {
    let themeId: string;
    let quizId: string;
    let questionId: string;
    let choiceIdCorrect: string;
    let choiceIdWrong: string;

    it('POST /admin/themes crée un thème', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/themes')
        .set('Cookie', auth(adminCookie))
        .send({
          slug: `theme-admin-${suffix}`,
          name: 'Thème admin',
          description: 'd',
          position: 1,
        });
      expect(response.status).toBe(201);
      themeId = response.body.id;
    });

    it('POST /admin/quizzes crée un quiz en DRAFT', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/quizzes')
        .set('Cookie', auth(adminCookie))
        .send({
          themeSlug: `theme-admin-${suffix}`,
          slug: `quiz-admin-${suffix}`,
          title: 'Quiz admin',
          description: 'd',
          difficulty: 'EASY',
        });
      expect(response.status).toBe(201);
      expect(response.body.status).toBe('DRAFT');
      quizId = response.body.id;
    });

    it('POST /admin/quizzes/:id/publish échoue sans questions', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/quizzes/${quizId}/publish`)
        .set('Cookie', auth(adminCookie));
      expect(response.status).toBe(400);
    });

    it('POST /admin/questions crée une question sans source (brouillon)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/questions')
        .set('Cookie', auth(adminCookie))
        .send({
          quizId,
          position: 1,
          type: 'SINGLE_CHOICE',
          statement: 'Question test',
          explanation: '',
          source: '',
        });
      expect(response.status).toBe(201);
      questionId = response.body.id;

      const quiz = await prisma.quiz.findUniqueOrThrow({ where: { id: quizId } });
      expect(quiz.questionCount).toBe(1);
    });

    it('POST /admin/quizzes/:id/publish bloque si une question n’a pas de source', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/quizzes/${quizId}/publish`)
        .set('Cookie', auth(adminCookie));
      expect(response.status).toBe(400);
      expect(response.body.missingSourceQuestionIds).toContain(questionId);
    });

    it('PATCH /admin/questions/:id complète source et explanation', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/admin/questions/${questionId}`)
        .set('Cookie', auth(adminCookie))
        .send({ explanation: 'Explication complète', source: 'Source vérifiable' });
      expect(response.status).toBe(200);
      expect(response.body.source).toBe('Source vérifiable');
    });

    it('POST /admin/questions/:id/choices ajoute deux choix', async () => {
      const correct = await request(app.getHttpServer())
        .post(`/api/v1/admin/questions/${questionId}/choices`)
        .set('Cookie', auth(adminCookie))
        .send({ position: 1, label: 'Bonne réponse', isCorrect: true });
      expect(correct.status).toBe(201);
      choiceIdCorrect = correct.body.id;

      const wrong = await request(app.getHttpServer())
        .post(`/api/v1/admin/questions/${questionId}/choices`)
        .set('Cookie', auth(adminCookie))
        .send({ position: 2, label: 'Mauvaise réponse', isCorrect: false });
      expect(wrong.status).toBe(201);
      choiceIdWrong = wrong.body.id;
    });

    it('PATCH /admin/questions/:id/choices/reorder réordonne les choix', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/admin/questions/${questionId}/choices/reorder`)
        .set('Cookie', auth(adminCookie))
        .send({ orderedChoiceIds: [choiceIdWrong, choiceIdCorrect] });

      expect(response.status).toBe(200);
      expect(response.body[0].id).toBe(choiceIdWrong);
      expect(response.body[0].position).toBe(1);
      expect(response.body[1].id).toBe(choiceIdCorrect);
      expect(response.body[1].position).toBe(2);
    });

    it('POST /admin/quizzes/:id/publish réussit une fois la question complète', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/quizzes/${quizId}/publish`)
        .set('Cookie', auth(adminCookie));
      expect(response.status).toBe(201);
      expect(response.body.status).toBe('PUBLISHED');
    });

    it('la modification d’une question déjà publiée est journalisée', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/questions/${questionId}`)
        .set('Cookie', auth(adminCookie))
        .send({ statement: 'Question test (modifiée après publication)' });

      const entries = await prisma.questionAuditLogEntry.findMany({ where: { questionId } });
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.some((e) => e.changedBy === adminId)).toBe(true);
    });

    it('GET /admin/questions/:id/audit-log expose le journal avec le nom de l’admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/admin/questions/${questionId}/audit-log`)
        .set('Cookie', auth(adminCookie));
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].changedByDisplayName).toBeTruthy();
      expect(['created', 'updated']).toContain(response.body[0].action);
    });

    it('GET /admin/quizzes/:id/preview expose isCorrect (vue admin)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/admin/quizzes/${quizId}/preview`)
        .set('Cookie', auth(adminCookie));
      expect(response.status).toBe(200);
      expect(
        response.body.questions[0].choices.some((c: { isCorrect: boolean }) => c.isCorrect),
      ).toBe(true);
    });

    it('GET /admin/quizzes/:id/export puis POST /admin/quizzes/import réimporte le quiz', async () => {
      const exportResponse = await request(app.getHttpServer())
        .get(`/api/v1/admin/quizzes/${quizId}/export`)
        .set('Cookie', auth(adminCookie));
      expect(exportResponse.status).toBe(200);
      expect(exportResponse.body.questions).toHaveLength(1);

      const importResponse = await request(app.getHttpServer())
        .post('/api/v1/admin/quizzes/import')
        .set('Cookie', auth(adminCookie))
        .send({ ...exportResponse.body, slug: `quiz-admin-import-${suffix}` });

      expect(importResponse.status).toBe(201);
      expect(importResponse.body.status).toBe('DRAFT'); // toujours DRAFT, même si la source était PUBLISHED
      expect(importResponse.body.questions).toHaveLength(1);

      await prisma.question.deleteMany({ where: { quizId: importResponse.body.id } });
      await prisma.quiz.deleteMany({ where: { id: importResponse.body.id } });
    });

    it('POST /admin/questions/:id/accepted-answers renvoie la normalisation appliquée', async () => {
      const freeTextQuestion = await request(app.getHttpServer())
        .post('/api/v1/admin/questions')
        .set('Cookie', auth(adminCookie))
        .send({
          quizId,
          position: 2,
          type: 'FREE_TEXT',
          statement: 'Quelle bataille ?',
          explanation: 'E',
          source: 'S',
        });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/questions/${freeTextQuestion.body.id}/accepted-answers`)
        .set('Cookie', auth(adminCookie))
        .send({ value: "la Bataille d'Austerlitz", isPrimary: true });

      expect(response.status).toBe(201);
      expect(response.body.normalizedValue).toBe('bataille dausterlitz');

      await prisma.acceptedAnswer.deleteMany({ where: { questionId: freeTextQuestion.body.id } });
      await prisma.question.delete({ where: { id: freeTextQuestion.body.id } });
    });

    it('DELETE /admin/themes/:id échoue si le thème contient un quiz', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/admin/themes/${themeId}`)
        .set('Cookie', auth(adminCookie));
      expect(response.status).toBe(409);
    });

    afterAll(async () => {
      await prisma.choice.deleteMany({ where: { questionId } });
      await prisma.questionAuditLogEntry.deleteMany({ where: { questionId } });
      await prisma.question.deleteMany({ where: { quizId } });
      await prisma.quiz.deleteMany({ where: { id: quizId } });
      await prisma.theme.deleteMany({ where: { id: themeId } });
    });
  });

  describe('File de révision des réponses libres', () => {
    let themeId: string;
    let quizId: string;
    let questionId: string;
    let reviewId: string;

    beforeAll(async () => {
      const theme = await prisma.theme.create({
        data: { slug: `theme-review-${suffix}`, name: 'T', description: 'd', position: 2 },
      });
      themeId = theme.id;
      const quiz = await prisma.quiz.create({
        data: {
          themeId,
          slug: `quiz-review-${suffix}`,
          title: 'Q',
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
          acceptedAnswers: { create: [{ value: 'Austerlitz', isPrimary: true }] },
        },
      });
      questionId = question.id;
      const review = await prisma.answerReview.create({
        data: { questionId, submittedText: 'Trafalgar', occurrences: 3 },
      });
      reviewId = review.id;
    });

    afterAll(async () => {
      await prisma.answerReview.deleteMany({ where: { questionId } });
      await prisma.acceptedAnswer.deleteMany({ where: { questionId } });
      await prisma.question.deleteMany({ where: { quizId } });
      await prisma.quiz.deleteMany({ where: { id: quizId } });
      await prisma.theme.deleteMany({ where: { id: themeId } });
    });

    it('GET /admin/answer-reviews?status=PENDING liste la révision', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/answer-reviews?status=PENDING')
        .set('Cookie', auth(adminCookie));
      expect(response.status).toBe(200);
      expect(response.body.items.some((r: { id: string }) => r.id === reviewId)).toBe(true);
    });

    it('POST /admin/answer-reviews/:id/accept promeut en AcceptedAnswer', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/answer-reviews/${reviewId}/accept`)
        .set('Cookie', auth(adminCookie));
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ACCEPTED');

      const promoted = await prisma.acceptedAnswer.findFirst({
        where: { questionId, value: 'Trafalgar' },
      });
      expect(promoted).not.toBeNull();
    });

    it('un second accept/reject sur la même révision échoue (déjà traitée)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/answer-reviews/${reviewId}/reject`)
        .set('Cookie', auth(adminCookie));
      expect(response.status).toBe(409);
    });
  });

  it('GET /admin/stats renvoie des compteurs globaux', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/stats')
      .set('Cookie', auth(adminCookie));
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('totalAttempts');
    expect(response.body).toHaveProperty('questionSuccessRates');
  });
});
