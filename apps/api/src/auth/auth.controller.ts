import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { GUEST_TOKEN_COOKIE } from '../attempts/identity';
import { AuthService, type AuthTokens } from './auth.service';
import {
  ACCESS_TOKEN_COOKIE,
  AUTH_COOKIE_PATH,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
} from './cookies';
import { Public } from './decorators/public.decorator';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, VerifyEmailDto } from './dto';
import { AccountThrottlerGuard } from './guards/account-throttler.guard';

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const isProduction = () => process.env.NODE_ENV === 'production';

@ApiTags('auth')
@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(AccountThrottlerGuard)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const guestToken = req.cookies?.[GUEST_TOKEN_COOKIE] as string | undefined;
    const { user, tokens } = await this.authService.register(dto, guestToken);
    this.setAuthCookies(res, tokens);
    if (guestToken) {
      // Le compte vient d'être créé (et les parties anonymes rattachées,
      // cf. claude.md §4.3) : le cookie invité n'a plus lieu d'être.
      res.clearCookie(GUEST_TOKEN_COOKIE, { path: '/' });
    }
    return { user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(AccountThrottlerGuard)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.authService.login(dto);
    this.setAuthCookies(res, tokens);
    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.[REFRESH_TOKEN_COOKIE]);
    clearAuthCookies(res);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.refresh(req.cookies?.[REFRESH_TOKEN_COOKIE]);
    this.setAuthCookies(res, tokens);
    return { ok: true };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
    return { ok: true };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(AccountThrottlerGuard)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return { ok: true };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { ok: true };
  }

  private setAuthCookies(res: Response, tokens: AuthTokens): void {
    res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      httpOnly: true,
      secure: isProduction(),
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    });
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction(),
      sameSite: 'lax',
      path: AUTH_COOKIE_PATH,
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });
  }
}
