import { Module } from '@nestjs/common';

import { DatabaseModule } from '../common/database/database.module.js';
import { CurriculumModule } from '../curriculum/curriculum.module.js';
import { LearningSessionsModule } from '../learning-sessions/learning-sessions.module.js';
import { OnboardingService } from './application/onboarding.service.js';
import { PlacementAttemptsService } from './application/placement-attempts.service.js';
import { OnboardingController } from './onboarding.controller.js';

@Module({
  controllers: [OnboardingController],
  exports: [OnboardingService],
  imports: [DatabaseModule, CurriculumModule, LearningSessionsModule],
  providers: [OnboardingService, PlacementAttemptsService],
})
export class OnboardingModule {}
