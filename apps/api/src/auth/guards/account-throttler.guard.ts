import { Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectThrottlerStorage, ThrottlerGuard } from '@nestjs/throttler';
import type { ThrottlerStorage } from '@nestjs/throttler';

/**
 * Limite les tentatives par compte (email), indépendamment de l'IP —
 * claude.md §5 : "rate limiting sur /auth/* (par IP et par compte)". Le
 * throttler global (voir AppModule) couvre déjà la dimension IP ; ce guard,
 * appliqué uniquement sur les routes sensibles (login/register/forgot-password),
 * couvre la dimension compte via sa propre configuration, indépendante du
 * throttler nommé global pour éviter qu'elle ne s'applique par défaut à
 * toutes les routes de l'API.
 */
@Injectable()
export class AccountThrottlerGuard extends ThrottlerGuard {
  constructor(
    @Inject(Reflector) reflector: Reflector,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
  ) {
    super(
      [
        {
          name: 'account',
          ttl: 15 * 60 * 1000,
          limit: 5,
          skipIf: () => process.env.NODE_ENV === 'test',
        },
      ],
      storageService,
      reflector,
    );
  }

  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const email = (req as { body?: { email?: string } }).body?.email;
    return typeof email === 'string' && email.length > 0 ? email.toLowerCase() : 'unknown';
  }
}
