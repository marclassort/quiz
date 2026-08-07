import { Module } from '@nestjs/common';

import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { QuizzesModule } from '../quizzes/quizzes.module';
import { UserStatsModule } from '../user-stats/user-stats.module';
import { AnswerReviewService } from './answer-review.service';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';

@Module({
  imports: [QuizzesModule, UserStatsModule],
  controllers: [AttemptsController],
  providers: [AttemptsService, AnswerReviewService, OptionalJwtAuthGuard],
  exports: [AnswerReviewService],
})
export class AttemptsModule {}
