import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { clearAuthCookies } from '../auth/cookies';
import type { AuthenticatedUser } from '../auth/types';
import { MyAttemptsQueryDto, UpdateMeDto } from './dto';
import { UsersService } from './users.service';

@ApiTags('me')
@Controller('me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMe(user.id);
  }

  @Patch()
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMe(user.id, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.usersService.deleteMe(user.id);
    clearAuthCookies(res);
  }

  @Get('export')
  async exportMe(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.usersService.exportMe(user.id);
    res.setHeader('Content-Disposition', 'attachment; filename="mes-donnees.json"');
    return data;
  }

  @Get('attempts')
  getMyAttempts(@CurrentUser() user: AuthenticatedUser, @Query() query: MyAttemptsQueryDto) {
    return this.usersService.getMyAttempts(user.id, query.page);
  }

  @Get('stats')
  getMyStats(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMyStats(user.id);
  }
}
