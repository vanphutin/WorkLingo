import { Module } from '@nestjs/common';

import { CurriculumModule } from '../curriculum/curriculum.module.js';
import { IeltsTopicAdminService } from '../ielts-study/application/ielts-topic-admin.service.js';
import { DatabaseModule } from '../common/database/database.module.js';
import { LearningProgramsService } from './application/learning-programs.service.js';
import { LearningProgramsController } from './learning-programs.controller.js';
import { ProgramContextService } from './application/program-context.service.js';
import { ProgramContextController } from './program-context.controller.js';
import { ProgramEnrollmentController } from './program-enrollment.controller.js';
import { AdminProgramsController } from './admin-programs.controller.js';
import { AdminProgramsService } from './application/admin-programs.service.js';

@Module({
  controllers: [LearningProgramsController, ProgramContextController, AdminProgramsController, ProgramEnrollmentController],
  exports: [ProgramContextService],
  imports: [DatabaseModule, CurriculumModule],
  providers: [IeltsTopicAdminService, LearningProgramsService, ProgramContextService, AdminProgramsService],
})
export class LearningProgramsModule {}
