import { Module } from '@nestjs/common';

import { DatabaseModule } from '../common/database/database.module.js';
import { ProgressService } from './application/progress.service.js';
import { ProgressController } from './progress.controller.js';

@Module({
  controllers: [ProgressController],
  imports: [DatabaseModule],
  providers: [ProgressService],
})
export class ProgressModule {}
