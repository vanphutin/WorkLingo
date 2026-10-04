import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { UsersModule } from '../users/users.module';
import { AuthService } from './application/auth.service';
import { AuthController } from './auth.controller';
import { PasswordHasher } from './infrastructure/password-hasher';
import { SessionAuthGuard } from './infrastructure/session-auth.guard';

@Module({
  controllers: [AuthController],
  exports: [AuthService],
  imports: [UsersModule],
  providers: [
    AuthService,
    PasswordHasher,
    { provide: APP_GUARD, useClass: SessionAuthGuard },
  ],
})
export class AuthModule {}
