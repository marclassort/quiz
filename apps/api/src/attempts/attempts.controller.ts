import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { Public } from '../auth/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { AttemptsService } from './attempts.service';
import { SubmitAnswerDto } from './dto';
import { resolveIdentity, resolveIdentityForCreation } from './identity';

/**
 * Pas de préfixe de classe : les routes suivent claude.md §7, qui imbrique
 * la création sous /quizzes/:slug/attempts mais garde le reste sous /attempts.
 */
@ApiTags('attempts')
@Controller()
@Public()
@UseGuards(OptionalJwtAuthGuard)
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Post('quizzes/:slug/attempts')
  createAttempt(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.attemptsService.createAttempt(slug, resolveIdentityForCreation(req, res));
  }

  @Get('attempts/:id/questions/current')
  getCurrentQuestion(@Param('id') id: string, @Req() req: Request) {
    return this.attemptsService.getCurrentQuestion(id, resolveIdentity(req));
  }

  @Post('attempts/:id/answers')
  submitAnswer(@Param('id') id: string, @Body() dto: SubmitAnswerDto, @Req() req: Request) {
    return this.attemptsService.submitAnswer(id, resolveIdentity(req), dto);
  }

  @Post('attempts/:id/finish')
  finish(@Param('id') id: string, @Req() req: Request) {
    return this.attemptsService.finish(id, resolveIdentity(req));
  }
}
