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

import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminQuizzesService } from './admin-quizzes.service';
import { AdminQuizListQueryDto, CreateQuizDto, QuizImportDto, UpdateQuizDto } from './dto';

@ApiTags('admin/quizzes')
@Controller('admin/quizzes')
@Roles('ADMIN')
export class AdminQuizzesController {
  constructor(private readonly adminQuizzesService: AdminQuizzesService) {}

  @Get()
  findAll(@Query() query: AdminQuizListQueryDto) {
    return this.adminQuizzesService.findAll(query);
  }

  @Post('import')
  importQuiz(@Body() dto: QuizImportDto) {
    return this.adminQuizzesService.importQuiz(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminQuizzesService.findOne(id);
  }

  @Get(':id/preview')
  preview(@Param('id') id: string) {
    return this.adminQuizzesService.preview(id);
  }

  @Get(':id/export')
  exportQuiz(@Param('id') id: string) {
    return this.adminQuizzesService.exportQuiz(id);
  }

  @Post()
  create(@Body() dto: CreateQuizDto) {
    return this.adminQuizzesService.create(dto);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.adminQuizzesService.publish(id);
  }

  @Post(':id/unpublish')
  unpublish(@Param('id') id: string) {
    return this.adminQuizzesService.unpublish(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateQuizDto) {
    return this.adminQuizzesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.adminQuizzesService.remove(id);
  }
}
