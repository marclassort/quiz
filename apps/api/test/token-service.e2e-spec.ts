import { Test, TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TokenService } from '../src/auth/token.service';

describe('TokenService (e2e)', () => {
  let prisma: PrismaService;
  let tokenService: TokenService;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleFixture.get(PrismaService);
    tokenService = moduleFixture.get(TokenService);

    const user = await prisma.user.create({
      data: {
        email: 'token-service-test@example.com',
        passwordHash: 'irrelevant-for-this-test',
        displayName: 'TokenServiceTest',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('signe et vérifie un access token', () => {
    const token = tokenService.signAccessToken({ id: userId, role: 'USER' });
    const payload = tokenService.verifyAccessToken(token);

    expect(payload.sub).toBe(userId);
    expect(payload.role).toBe('USER');
  });

  it('émet, fait tourner puis invalide un refresh token', async () => {
    const rawToken = await tokenService.issueRefreshToken(userId);

    const rotated = await tokenService.rotateRefreshToken(rawToken);
    expect(rotated?.userId).toBe(userId);
    expect(rotated?.rawToken).not.toBe(rawToken);

    // L'ancien token, déjà utilisé pour tourner, ne doit plus être valable.
    const secondAttempt = await tokenService.rotateRefreshToken(rawToken);
    expect(secondAttempt).toBeNull();
  });

  it('révoque un refresh token explicitement (logout)', async () => {
    const rawToken = await tokenService.issueRefreshToken(userId);
    await tokenService.revokeRefreshToken(rawToken);

    const rotated = await tokenService.rotateRefreshToken(rawToken);
    expect(rotated).toBeNull();
  });

  it('révoque tous les refresh tokens actifs d’un utilisateur', async () => {
    const tokenA = await tokenService.issueRefreshToken(userId);
    const tokenB = await tokenService.issueRefreshToken(userId);

    await tokenService.revokeAllRefreshTokensForUser(userId);

    expect(await tokenService.rotateRefreshToken(tokenA)).toBeNull();
    expect(await tokenService.rotateRefreshToken(tokenB)).toBeNull();
  });

  it("signe et vérifie un token de vérification d'email", () => {
    const token = tokenService.signEmailVerificationToken(userId);
    const payload = tokenService.verifyEmailVerificationToken(token);

    expect(payload.sub).toBe(userId);
    expect(payload.purpose).toBe('email-verification');
  });

  it('émet un token de réinitialisation de mot de passe à usage unique', async () => {
    const rawToken = await tokenService.issuePasswordResetToken(userId);

    const consumedUserId = await tokenService.consumePasswordResetToken(rawToken);
    expect(consumedUserId).toBe(userId);

    // Le token a été consommé : une seconde utilisation doit échouer.
    const secondAttempt = await tokenService.consumePasswordResetToken(rawToken);
    expect(secondAttempt).toBeNull();
  });
});
