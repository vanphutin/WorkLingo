import { Module } from '@nestjs/common';
import { DatabaseModule } from '../common/database/database.module.js';
import { FoundationCurriculumService } from './application/foundation-curriculum.service.js';
import { FoundationAdminController } from './foundation-admin.controller.js';
import { LearningProgramsModule } from '../learning-programs/learning-programs.module.js';
import { CurriculumEligibilityService } from './application/curriculum-eligibility.service.js';
import { CurriculumProgressService } from './application/curriculum-progress.service.js';
import { CurriculumRoadmapController } from './curriculum-roadmap.controller.js';

@Module({ imports: [DatabaseModule, LearningProgramsModule], controllers: [FoundationAdminController, CurriculumRoadmapController],
  providers: [FoundationCurriculumService, CurriculumEligibilityService, CurriculumProgressService],
  exports: [FoundationCurriculumService, CurriculumEligibilityService, CurriculumProgressService] })
export class CurriculumFoundationModule {}
