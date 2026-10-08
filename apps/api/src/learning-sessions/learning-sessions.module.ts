import { Module } from '@nestjs/common';

import { DatabaseModule } from '../common/database/database.module.js';
import { CurriculumModule } from '../curriculum/curriculum.module.js';
import { MasteryModule } from '../mastery/mastery.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { LearningSessionsService } from './application/learning-sessions.service.js';
import { LearningSessionsController } from './learning-sessions.controller.js';

@Module({
  controllers: [LearningSessionsController],
  exports: [LearningSessionsService],
  imports: [DatabaseModule, CurriculumModule, MasteryModule, JobsModule],
  providers: [LearningSessionsService],
})
export class LearningSessionsModule {}
