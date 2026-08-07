import { execFileSync } from 'node:child_process';
import path from 'node:path';

import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';
import { ProblemDetailsFilter } from '../src/common/filters/problem-details.filter';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const THEME_SLUG = 'periode-napoleonienne';
const QUIZ_SLUGS = ['grandes-batailles-napoleoniennes', 'institutions-dates-cles-empire'];

describe('Seed napoléonien (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    execFileSync('pnpm', ['exec', 'tsx', 'prisma/seed.ts'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'ignore',
    });

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
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('crée exactement 20 questions réparties en 2 quiz DRAFT', async () => {
    const quizzes = await prisma.quiz.findMany({
      where: { slug: { in: QUIZ_SLUGS } },
      include: { _count: { select: { questions: true } } },
    });

    expect(quizzes).toHaveLength(2);
    for (const quiz of quizzes) {
      expect(quiz.status).toBe('DRAFT');
    }
    const totalQuestions = quizzes.reduce((sum, q) => sum + q._count.questions, 0);
    expect(totalQuestions).toBe(20);
  });

  it('chaque question a une source et une explication non vides (claude.md §10)', async () => {
    const questions = await prisma.question.findMany({
      where: { quiz: { slug: { in: QUIZ_SLUGS } } },
    });

    expect(questions).toHaveLength(20);
    for (const question of questions) {
      expect(question.source.trim().length).toBeGreaterThan(0);
      expect(question.explanation.trim().length).toBeGreaterThan(0);
    }
  });

  it('chaque question FREE_TEXT a au moins une réponse acceptée primaire', async () => {
    const freeTextQuestions = await prisma.question.findMany({
      where: { quiz: { slug: { in: QUIZ_SLUGS } }, type: 'FREE_TEXT' },
      include: { acceptedAnswers: true },
    });

    expect(freeTextQuestions.length).toBeGreaterThan(0);
    for (const question of freeTextQuestions) {
      expect(question.acceptedAnswers.length).toBeGreaterThan(0);
      expect(question.acceptedAnswers.some((a) => a.isPrimary)).toBe(true);
    }
  });

  it('chaque question à choix a au moins une réponse correcte', async () => {
    const choiceQuestions = await prisma.question.findMany({
      where: { quiz: { slug: { in: QUIZ_SLUGS } }, type: { not: 'FREE_TEXT' } },
      include: { choices: true },
    });

    expect(choiceQuestions.length).toBeGreaterThan(0);
    for (const question of choiceQuestions) {
      expect(question.choices.some((c) => c.isCorrect)).toBe(true);
    }
  });

  it('re-exécuter le seed est idempotent (pas de doublons)', async () => {
    execFileSync('pnpm', ['exec', 'tsx', 'prisma/seed.ts'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'ignore',
    });

    const themes = await prisma.theme.count({ where: { slug: THEME_SLUG } });
    const quizzes = await prisma.quiz.count({ where: { slug: { in: QUIZ_SLUGS } } });
    const questions = await prisma.question.count({
      where: { quiz: { slug: { in: QUIZ_SLUGS } } },
    });

    expect(themes).toBe(1);
    expect(quizzes).toBe(2);
    expect(questions).toBe(20);
  });

  it('le thème est public mais les quiz DRAFT sont invisibles côté API publique', async () => {
    const themesResponse = await request(app.getHttpServer()).get('/api/v1/themes');
    expect(themesResponse.body.some((t: { slug: string }) => t.slug === THEME_SLUG)).toBe(true);

    const quizzesResponse = await request(app.getHttpServer()).get(
      `/api/v1/quizzes?theme=${THEME_SLUG}`,
    );
    expect(quizzesResponse.body.items).toHaveLength(0);

    for (const slug of QUIZ_SLUGS) {
      const detailResponse = await request(app.getHttpServer()).get(`/api/v1/quizzes/${slug}`);
      expect(detailResponse.status).toBe(404);

      const attemptResponse = await request(app.getHttpServer()).post(
        `/api/v1/quizzes/${slug}/attempts`,
      );
      expect(attemptResponse.status).toBe(404);
    }
  });
});
