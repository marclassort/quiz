import { randomUUID } from 'node:crypto';

import type { Request, Response } from 'express';

export const GUEST_TOKEN_COOKIE = 'guest_token';
const GUEST_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours (claude.md §4.1)

export interface Identity {
  userId?: string;
  guestToken?: string;
}

function currentUserId(req: Request): string | undefined {
  return (req.user as { id: string } | undefined)?.id;
}

export function resolveIdentity(req: Request): Identity {
  const userId = currentUserId(req);
  if (userId) {
    return { userId };
  }
  return { guestToken: req.cookies?.[GUEST_TOKEN_COOKIE] };
}

/**
 * Utilisé uniquement à la création d'un Attempt : réutilise le guestToken
 * existant s'il y en a un (joueur anonyme revenant sur un autre quiz), sinon
 * en émet un nouveau et pose le cookie httpOnly 30 jours.
 */
export function resolveIdentityForCreation(req: Request, res: Response): Identity {
  const userId = currentUserId(req);
  if (userId) {
    return { userId };
  }

  const existingGuestToken = req.cookies?.[GUEST_TOKEN_COOKIE];
  const guestToken = existingGuestToken ?? randomUUID();

  if (!existingGuestToken) {
    res.cookie(GUEST_TOKEN_COOKIE, guestToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: GUEST_TOKEN_MAX_AGE_MS,
    });
  }

  return { guestToken };
}
