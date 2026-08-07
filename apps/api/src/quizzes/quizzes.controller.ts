import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { QuizListQueryDto } from './dto';
import { QuizzesService } from './quizzes.service';

@ApiTags('quizzes')
@Controller('quizzes')
@Public()
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Get()
  findAll(@Query() query: QuizListQueryDto) {
    return this.quizzesService.findAll(query);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.quizzesService.findBySlug(slug);
  }
}
