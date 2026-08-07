import { Module } from '@nestjs/common';

import { AdminAnswerReviewsController } from './answer-reviews/admin-answer-reviews.controller';
import { AdminAnswerReviewsService } from './answer-reviews/admin-answer-reviews.service';
import { QuestionAuditLogService } from './question-audit-log.service';
import { AdminQuestionsController } from './questions/admin-questions.controller';
import { AdminQuestionsService } from './questions/admin-questions.service';
import { AdminQuizzesController } from './quizzes/admin-quizzes.controller';
import { AdminQuizzesService } from './quizzes/admin-quizzes.service';
import { AdminStatsController } from './stats/admin-stats.controller';
import { AdminStatsService } from './stats/admin-stats.service';
import { AdminThemesController } from './themes/admin-themes.controller';
import { AdminThemesService } from './themes/admin-themes.service';

@Module({
  controllers: [
    AdminThemesController,
    AdminQuizzesController,
    AdminQuestionsController,
    AdminAnswerReviewsController,
    AdminStatsController,
  ],
  providers: [
    AdminThemesService,
    AdminQuizzesService,
    AdminQuestionsService,
    AdminAnswerReviewsService,
    AdminStatsService,
    QuestionAuditLogService,
  ],
})
export class AdminModule {}
