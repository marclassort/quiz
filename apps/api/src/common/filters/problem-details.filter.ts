import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

const REASON_PHRASES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

interface FieldError {
  path?: (string | number)[];
  message?: string;
}

/**
 * Réponses d'erreur au format RFC 9457 `application/problem+json`
 * (claude.md §7), appliqué globalement plutôt que gabarit répété dans
 * chaque contrôleur. Convertit :
 * - les `HttpException` "simples" (message string) ;
 * - les exceptions à corps enrichi (ex. `BadRequestException({ message,
 *   missingSourceQuestionIds })` dans AdminQuizzesService.publish()) — les
 *   champs additionnels sont conservés comme extensions du problem+json ;
 * - les erreurs de validation Zod (`{ message: 'Validation failed', errors:
 *   [...] }` produites par ZodValidationPipe) — condensées en un `detail`
 *   lisible plutôt que "Validation failed" seul.
 *
 * Les erreurs non gérées (5xx) ne renvoient jamais le message interne au
 * client (claude.md §11 : pas de fuite d'information technique), seulement
 * un titre générique ; le détail réel est journalisé côté serveur.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ProblemDetailsFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const title = REASON_PHRASES[status] ?? 'Error';

    let detail: string | undefined;
    let extensions: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        detail = body;
      } else if (body && typeof body === 'object') {
        const bodyRecord = body as Record<string, unknown>;
        const { message, errors } = bodyRecord;
        extensions = Object.fromEntries(
          Object.entries(bodyRecord).filter(
            ([key]) => !['statusCode', 'message', 'error', 'errors'].includes(key),
          ),
        );
        if (Array.isArray(errors) && errors.length > 0) {
          detail = (errors as FieldError[])
            .map((fieldError) =>
              fieldError.path?.length
                ? `${fieldError.path.join('.')} : ${fieldError.message}`
                : (fieldError.message ?? title),
            )
            .join(' ; ');
        } else if (typeof message === 'string') {
          detail = message;
        }
      }
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response
      .status(status)
      .header('Content-Type', 'application/problem+json')
      .json({
        type: 'about:blank',
        title,
        status,
        detail: detail ?? title,
        instance: request.originalUrl,
        ...extensions,
      });
  }
}
