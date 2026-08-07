import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../auth/types';
import { AdminAnswerReviewsService } from './admin-answer-reviews.service';
import { AnswerReviewListQueryDto } from './dto';

@ApiTags('admin/answer-reviews')
@Controller('admin/answer-reviews')
@Roles('ADMIN')
export class AdminAnswerReviewsController {
  constructor(private readonly adminAnswerReviewsService: AdminAnswerReviewsService) {}

  @Get()
  findAll(@Query() query: AnswerReviewListQueryDto) {
    return this.adminAnswerReviewsService.findAll(query);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  accept(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.adminAnswerReviewsService.accept(id, user.id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.adminAnswerReviewsService.reject(id, user.id);
  }
}
