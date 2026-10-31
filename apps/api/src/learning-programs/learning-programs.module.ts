import { ProgramProgressService } from './application/program-progress.service.js';
import { AdminProgramEnrollmentsController } from './admin-program-enrollments.controller.js';
import { ProgramEnrollmentsService } from './application/program-enrollments.service.js';
import { ProgramVersionsController } from './program-versions.controller.js';
import { ProgramVersionsService } from './application/program-versions.service.js';
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
  controllers: [AdminProgramEnrollmentsController, ProgramVersionsController, LearningProgramsController, ProgramContextController, AdminProgramsController, ProgramEnrollmentController],
  exports: [ProgramContextService, ProgramProgressService],
  imports: [DatabaseModule, CurriculumModule],
  providers: [ProgramProgressService, ProgramEnrollmentsService, ProgramVersionsService, IeltsTopicAdminService, LearningProgramsService, ProgramContextService, AdminProgramsService],
})
export class LearningProgramsModule {}
