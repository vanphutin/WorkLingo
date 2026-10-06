import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { UsersModule } from '../users/users.module';
import { AuthService } from './application/auth.service';
import { AuthController } from './auth.controller';
import { PasswordHasher } from './infrastructure/password-hasher.js';
import { RolesGuard } from './infrastructure/roles.guard.js';
import { SessionAuthGuard } from './infrastructure/session-auth.guard.js';

@Module({
  controllers: [AuthController],
  exports: [AuthService],
  imports: [UsersModule],
  providers: [
    AuthService,
    PasswordHasher,
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
