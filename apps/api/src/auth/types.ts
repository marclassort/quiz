import type { UserRole } from '../generated/prisma/enums';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export interface EmailVerificationTokenPayload {
  sub: string;
  purpose: 'email-verification';
}

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}
