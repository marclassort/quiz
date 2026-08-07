import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { LeaderboardQueryDto } from './dto';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('leaderboard')
@Controller()
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('leaderboard')
  @Public()
  getLeaderboard(@Query() query: LeaderboardQueryDto) {
    return this.leaderboardService.getLeaderboard(query.scope, query.page, query.themeSlug);
  }

  @Get('me/rank')
  getMyRank(@CurrentUser() user: AuthenticatedUser) {
    return this.leaderboardService.getMyRank(user.id);
  }
}
