import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from '../database/database.module.js';
import { RateLimitService } from './rate-limit.service.js';
import { RateLimitGuard } from './rate-limit.guard.js';
import { RateLimitCleanupService } from './rate-limit-cleanup.service.js';

@Global()
@Module({
  exports: [RateLimitService, RateLimitGuard, RateLimitCleanupService],
  imports: [DatabaseModule],
  providers: [
    RateLimitService,
    RateLimitCleanupService,
    RateLimitGuard,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class RateLimitModule {}
