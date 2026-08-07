import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '@quiz/shared';

import { UserStatsService } from '../user-stats/user-stats.service';
import { MailService } from './mail.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import type { AuthenticatedUser } from './types';

export interface SanitizedUser {
  id: string;
  displayName: string;
  role: AuthenticatedUser['role'];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

function sanitizeUser(user: {
  id: string;
  displayName: string;
  role: AuthenticatedUser['role'];
}): SanitizedUser {
  return { id: user.id, displayName: user.displayName, role: user.role };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly mailService: MailService,
    private readonly userStatsService: UserStatsService,
  ) {}

  async register(
    input: RegisterInput,
    guestToken?: string,
  ): Promise<{ user: SanitizedUser; tokens: AuthTokens }> {
    await this.passwordService.assertStrongEnough(input.password, [input.email, input.displayName]);

    const passwordHash = await this.passwordService.hash(input.password);

    let user;
    try {
      user = await this.prisma.user.create({
        data: { email: input.email, passwordHash, displayName: input.displayName },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Cet email ou ce nom public est déjà utilisé.');
      }
      throw error;
    }

    if (guestToken) {
      await this.claimGuestAttempts(user.id, guestToken);
    }

    const verificationToken = this.tokenService.signEmailVerificationToken(user.id);
    await this.mailService.sendVerificationEmail(user.email, verificationToken);

    const tokens = await this.issueTokens(user);
    return { user: sanitizeUser(user), tokens };
  }

  /**
   * claude.md §4.3 : rattache les Attempt anonymes au nouveau compte
   * (transaction : set userId, null guestToken, recalcul de UserStats).
   * Idempotent par construction : une fois rattachés, ces Attempt n'ont plus
   * ce guestToken — un second appel avec le même token ne trouve donc plus
   * rien à rattacher.
   */
  private async claimGuestAttempts(userId: string, guestToken: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.attempt.updateMany({
        where: { guestToken },
        data: { userId, guestToken: null },
      });

      if (count > 0) {
        await this.userStatsService.recomputeForUser(userId, tx);
      }
    });
  }

  async login(input: LoginInput): Promise<{ user: SanitizedUser; tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });

    if (!user || user.deletedAt !== null) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const passwordMatches = await this.passwordService.verify(user.passwordHash, input.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const tokens = await this.issueTokens(user);
    return { user: sanitizeUser(user), tokens };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) {
      await this.tokenService.revokeRefreshToken(refreshToken);
    }
  }

  async refresh(refreshToken: string | undefined): Promise<AuthTokens> {
    if (!refreshToken) {
      throw new UnauthorizedException();
    }

    const rotated = await this.tokenService.rotateRefreshToken(refreshToken);
    if (!rotated) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({ where: { id: rotated.userId } });
    if (!user || user.deletedAt !== null) {
      throw new UnauthorizedException();
    }

    return {
      accessToken: this.tokenService.signAccessToken({ id: user.id, role: user.role }),
      refreshToken: rotated.rawToken,
    };
  }

  async verifyEmail(token: string): Promise<void> {
    let payload;
    try {
      payload = this.tokenService.verifyEmailVerificationToken(token);
    } catch {
      throw new UnauthorizedException('Lien de vérification invalide ou expiré.');
    }

    await this.prisma.user.updateMany({
      where: { id: payload.sub, deletedAt: null },
      data: { emailVerifiedAt: new Date() },
    });
  }

  /**
   * Ne révèle jamais si l'email existe en base (protection contre
   * l'énumération de comptes) : réponse identique dans tous les cas.
   */
  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });

    if (!user || user.deletedAt !== null) {
      return;
    }

    const resetToken = await this.tokenService.issuePasswordResetToken(user.id);
    await this.mailService.sendPasswordResetEmail(user.email, resetToken);
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const userId = await this.tokenService.consumePasswordResetToken(input.token);
    if (!userId) {
      throw new UnauthorizedException('Lien de réinitialisation invalide ou expiré.');
    }

    await this.passwordService.assertStrongEnough(input.password);
    const passwordHash = await this.passwordService.hash(input.password);

    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.tokenService.revokeAllRefreshTokensForUser(userId);
  }

  private async issueTokens(user: {
    id: string;
    role: AuthenticatedUser['role'];
  }): Promise<AuthTokens> {
    const accessToken = this.tokenService.signAccessToken({ id: user.id, role: user.role });
    const refreshToken = await this.tokenService.issueRefreshToken(user.id);
    return { accessToken, refreshToken };
  }
}
