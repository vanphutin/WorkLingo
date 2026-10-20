import { Module } from '@nestjs/common';

import { DatabaseModule } from '../common/database/database.module.js';
import { ProgressService } from './application/progress.service.js';
import { ProgressController } from './progress.controller.js';
import { LearningProgramsModule } from '../learning-programs/learning-programs.module.js';

@Module({
  controllers: [ProgressController],
  imports: [DatabaseModule, LearningProgramsModule],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
