import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { UserStatsModule } from '../user-stats/user-stats.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccountThrottlerGuard } from './guards/account-throttler.guard';
import { MailService } from './mail.service';
import { PasswordService } from './password.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';

@Module({
  imports: [PassportModule, JwtModule.register({}), UserStatsModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    MailService,
    JwtStrategy,
    AccountThrottlerGuard,
  ],
  exports: [TokenService],
})
export class AuthModule {}
