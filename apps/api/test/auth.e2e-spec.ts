import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';
import { ProblemDetailsFilter } from '../src/common/filters/problem-details.filter';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { TokenService } from '../src/auth/token.service';
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

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const email = 'auth-e2e-test@example.com';
  const password = 'un-mot-de-passe-solide-42';
  const displayName = 'AuthE2ETest';

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
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { user: { email } } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
    await app.close();
  });

  it('POST /auth/register crée un compte, ne renvoie jamais l’email, et pose les cookies', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, displayName });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ displayName, role: 'USER' });
    expect(response.body.user.email).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain(email);

    expect(extractCookie(response.headers['set-cookie'], 'access_token')).toBeTruthy();
    expect(extractCookie(response.headers['set-cookie'], 'refresh_token')).toBeTruthy();
  });

  it('POST /auth/register rejette un email déjà utilisé (409)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, displayName: 'AutreNom' });

    expect(response.status).toBe(409);
  });

  it('POST /auth/login refuse un mauvais mot de passe (401)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'mauvais-mot-de-passe' });

    expect(response.status).toBe(401);
  });

  it('POST /auth/login accepte les bons identifiants et pose les cookies', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });

    expect(response.status).toBe(200);
    expect(extractCookie(response.headers['set-cookie'], 'access_token')).toBeTruthy();
    expect(extractCookie(response.headers['set-cookie'], 'refresh_token')).toBeTruthy();
  });

  it('POST /auth/refresh fait tourner le refresh token et invalide l’ancien', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    const oldRefreshToken = extractCookie(loginResponse.headers['set-cookie'], 'refresh_token');

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refresh_token=${oldRefreshToken}`);

    expect(refreshResponse.status).toBe(200);
    const newRefreshToken = extractCookie(refreshResponse.headers['set-cookie'], 'refresh_token');
    expect(newRefreshToken).toBeTruthy();
    expect(newRefreshToken).not.toBe(oldRefreshToken);

    const reuseOldTokenResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refresh_token=${oldRefreshToken}`);
    expect(reuseOldTokenResponse.status).toBe(401);
  });

  it('POST /auth/logout révoque le refresh token', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    const refreshToken = extractCookie(loginResponse.headers['set-cookie'], 'refresh_token');

    const logoutResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', `refresh_token=${refreshToken}`);
    expect(logoutResponse.status).toBe(204);

    const refreshAfterLogout = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refresh_token=${refreshToken}`);
    expect(refreshAfterLogout.status).toBe(401);
  });

  it('POST /auth/verify-email marque l’email comme vérifié', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.emailVerifiedAt).toBeNull();

    const tokenService = app.get(TokenService);
    const verificationToken = tokenService.signEmailVerificationToken(user.id);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token: verificationToken });
    expect(response.status).toBe(200);

    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(updatedUser.emailVerifiedAt).not.toBeNull();
  });

  it('POST /auth/forgot-password répond toujours 200, même pour un email inconnu (anti-énumération)', async () => {
    const known = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email });
    const unknown = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'inconnu-totalement@example.com' });

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
  });

  it('POST /auth/reset-password change le mot de passe, révoque les sessions, et le token est à usage unique', async () => {
    const newPassword = 'un-nouveau-mot-de-passe-encore-plus-solide-77';

    const tokenService = app.get(TokenService);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const resetToken = await tokenService.issuePasswordResetToken(user.id);

    const resetResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, password: newPassword });
    expect(resetResponse.status).toBe(200);

    const reuseResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, password: 'encore-un-autre-mot-de-passe-88' });
    expect(reuseResponse.status).toBe(401);

    const loginWithOldPassword = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    expect(loginWithOldPassword.status).toBe(401);

    const loginWithNewPassword = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: newPassword });
    expect(loginWithNewPassword.status).toBe(200);
  });
});
