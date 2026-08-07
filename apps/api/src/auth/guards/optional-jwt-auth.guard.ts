import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Comme JwtAuthGuard, mais ne bloque jamais la requête : si aucun cookie
 * `access_token` valide n'est présent, `req.user` reste simplement undefined
 * (parcours anonyme, cf. claude.md §4.1). Utilisé sur les routes de jeu
 * public + auth optionnelle (POST .../attempts et consorts).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = unknown>(_err: unknown, user: unknown): TUser {
    return (user ?? undefined) as TUser;
  }
}
