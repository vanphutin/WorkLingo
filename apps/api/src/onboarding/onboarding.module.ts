import { Module } from '@nestjs/common';

import { DatabaseModule } from '../common/database/database.module.js';
import { OnboardingService } from './application/onboarding.service.js';
import { OnboardingController } from './onboarding.controller.js';

@Module({
  controllers: [OnboardingController],
  exports: [OnboardingService],
  imports: [DatabaseModule],
  providers: [OnboardingService],
})
export class OnboardingModule {}
