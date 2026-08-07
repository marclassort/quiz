import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../auth/types';
import { AdminQuestionsService } from './admin-questions.service';
import {
  AdminQuestionListQueryDto,
  CreateAcceptedAnswerDto,
  CreateChoiceDto,
  CreateQuestionDto,
  ReorderChoicesDto,
  UpdateAcceptedAnswerDto,
  UpdateChoiceDto,
  UpdateQuestionDto,
} from './dto';

@ApiTags('admin/questions')
@Controller('admin/questions')
@Roles('ADMIN')
export class AdminQuestionsController {
  constructor(private readonly adminQuestionsService: AdminQuestionsService) {}

  @Get()
  findAll(@Query() query: AdminQuestionListQueryDto) {
    return this.adminQuestionsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminQuestionsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateQuestionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.adminQuestionsService.create(dto, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminQuestionsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.adminQuestionsService.remove(id);
  }

  @Get(':id/choices')
  listChoices(@Param('id') id: string) {
    return this.adminQuestionsService.listChoices(id);
  }

  @Get(':id/audit-log')
  listAuditLog(@Param('id') id: string) {
    return this.adminQuestionsService.listAuditLog(id);
  }

  @Post(':id/choices')
  createChoice(
    @Param('id') id: string,
    @Body() dto: CreateChoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminQuestionsService.createChoice(id, dto, user.id);
  }

  // Route statique enregistrée avant ":choiceId" pour éviter que "reorder"
  // ne soit interprété comme un identifiant de choix.
  @Patch(':id/choices/reorder')
  reorderChoices(
    @Param('id') id: string,
    @Body() dto: ReorderChoicesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminQuestionsService.reorderChoices(id, dto, user.id);
  }

  @Patch(':id/choices/:choiceId')
  updateChoice(
    @Param('id') id: string,
    @Param('choiceId') choiceId: string,
    @Body() dto: UpdateChoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminQuestionsService.updateChoice(id, choiceId, dto, user.id);
  }

  @Delete(':id/choices/:choiceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeChoice(
    @Param('id') id: string,
    @Param('choiceId') choiceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminQuestionsService.removeChoice(id, choiceId, user.id);
  }

  @Get(':id/accepted-answers')
  listAcceptedAnswers(@Param('id') id: string) {
    return this.adminQuestionsService.listAcceptedAnswers(id);
  }

  @Post(':id/accepted-answers')
  createAcceptedAnswer(
    @Param('id') id: string,
    @Body() dto: CreateAcceptedAnswerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminQuestionsService.createAcceptedAnswer(id, dto, user.id);
  }

  @Patch(':id/accepted-answers/:answerId')
  updateAcceptedAnswer(
    @Param('id') id: string,
    @Param('answerId') answerId: string,
    @Body() dto: UpdateAcceptedAnswerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminQuestionsService.updateAcceptedAnswer(id, answerId, dto, user.id);
  }

  @Delete(':id/accepted-answers/:answerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAcceptedAnswer(
    @Param('id') id: string,
    @Param('answerId') answerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminQuestionsService.removeAcceptedAnswer(id, answerId, user.id);
  }
}
