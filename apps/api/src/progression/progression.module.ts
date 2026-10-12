import { Module } from '@nestjs/common';

import { DatabaseModule } from '../common/database/database.module.js';
import { ProgressionService } from './application/progression.service.js';
import { ProgressionController } from './progression.controller.js';
import { LearningProgramsModule } from '../learning-programs/learning-programs.module.js';

@Module({
  imports: [DatabaseModule, LearningProgramsModule],
  controllers: [ProgressionController],
  providers: [ProgressionService],
  exports: [ProgressionService],
})
export class ProgressionModule {}
