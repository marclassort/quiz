import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/common/filters/problem-details.filter';

/**
 * claude.md §7 : "Réponses d'erreur au format RFC 9457
 * (application/problem+json)." Contrat vérifié indépendamment de tout
 * scénario métier particulier.
 */
describe('Erreurs au format RFC 9457 (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('une 404 renvoie application/problem+json avec type/title/status/detail/instance', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/themes/introuvable');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body).toMatchObject({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      instance: '/api/v1/themes/introuvable',
    });
    expect(response.body.detail).toBeTruthy();
    expect(response.body.detail).not.toBe('Not Found');
  });

  it('une erreur de validation Zod condense les erreurs de champ dans `detail`', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short', displayName: 'x' });

    expect(response.status).toBe(400);
    expect(response.body.detail).toContain('email');
    expect(response.body.detail).toContain('password');
    expect(response.body.detail).toContain('displayName');
  });
});
