import { Module } from '@nestjs/common';
import { DatabaseModule } from '../common/database/database.module.js';
import { FoundationCurriculumService } from './application/foundation-curriculum.service.js';
import { FoundationAdminController } from './foundation-admin.controller.js';
import { LearningProgramsModule } from '../learning-programs/learning-programs.module.js';
import { CurriculumEligibilityService } from './application/curriculum-eligibility.service.js';

@Module({ imports: [DatabaseModule, LearningProgramsModule], controllers: [FoundationAdminController],
  providers: [FoundationCurriculumService, CurriculumEligibilityService], exports: [FoundationCurriculumService, CurriculumEligibilityService] })
export class CurriculumFoundationModule {}
