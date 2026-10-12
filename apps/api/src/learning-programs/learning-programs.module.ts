import { Module } from '@nestjs/common';

import { DatabaseModule } from '../common/database/database.module.js';
import { LearningProgramsService } from './application/learning-programs.service.js';
import { LearningProgramsController } from './learning-programs.controller.js';

@Module({
  controllers: [LearningProgramsController],
  imports: [DatabaseModule],
  providers: [LearningProgramsService],
})
export class LearningProgramsModule {}
