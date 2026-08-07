import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../prisma/prisma.service';
import type { AccessTokenPayload, AuthenticatedUser, EmailVerificationTokenPayload } from './types';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h (claude.md §5)
const EMAIL_VERIFICATION_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24h
const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15min (claude.md §5)

function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  signAccessToken(user: AuthenticatedUser): string {
    const payload: AccessTokenPayload = { sub: user.id, role: user.role };
    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.accessTokenTtlSeconds(),
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.jwtService.verify<AccessTokenPayload>(token, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  private accessTokenTtlSeconds(): number {
    const raw = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN_SECONDS');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : DEFAULT_ACCESS_TOKEN_TTL_SECONDS;
  }

  async issueRefreshToken(userId: string): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashOpaqueToken(rawToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return rawToken;
  }

  /**
   * Valide un refresh token et le fait tourner (révoque l'ancien, en émet un
   * nouveau) — claude.md §5 : "refresh token en rotation stocké en base
   * (révocable)".
   */
  async rotateRefreshToken(rawToken: string): Promise<{ userId: string; rawToken: string } | null> {
    const tokenHash = hashOpaqueToken(rawToken);

    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!existing || existing.revokedAt !== null || existing.expiresAt < new Date()) {
      return null;
    }

    const nextRawToken = randomBytes(32).toString('hex');

    await this.prisma.$transaction([
      this.prisma.refreshToken.create({
        data: {
          userId: existing.userId,
          tokenHash: hashOpaqueToken(nextRawToken),
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
      }),
      this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { userId: existing.userId, rawToken: nextRawToken };
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = hashOpaqueToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllRefreshTokensForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  signEmailVerificationToken(userId: string): string {
    const payload: EmailVerificationTokenPayload = { sub: userId, purpose: 'email-verification' };
    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_EMAIL_VERIFICATION_SECRET'),
      expiresIn: EMAIL_VERIFICATION_TOKEN_TTL_SECONDS,
    });
  }

  verifyEmailVerificationToken(token: string): EmailVerificationTokenPayload {
    return this.jwtService.verify<EmailVerificationTokenPayload>(token, {
      secret: this.configService.getOrThrow<string>('JWT_EMAIL_VERIFICATION_SECRET'),
    });
  }

  /**
   * Token opaque à usage unique (claude.md §5) : le hash est stocké sur
   * l'utilisateur et effacé à la consommation, contrairement au lien de
   * vérification d'email qui est un JWT signé sans état côté serveur.
   */
  async issuePasswordResetToken(userId: string): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetTokenHash: hashOpaqueToken(rawToken),
        passwordResetTokenExpiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
      },
    });

    return rawToken;
  }

  async consumePasswordResetToken(rawToken: string): Promise<string | null> {
    const tokenHash = hashOpaqueToken(rawToken);

    const user = await this.prisma.user.findFirst({
      where: { passwordResetTokenHash: tokenHash, passwordResetTokenExpiresAt: { gt: new Date() } },
    });

    if (!user) {
      return null;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetTokenHash: null, passwordResetTokenExpiresAt: null },
    });

    return user.id;
  }
}
