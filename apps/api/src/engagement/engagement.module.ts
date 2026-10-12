import { Module } from '@nestjs/common';

import { DatabaseModule } from '../common/database/database.module.js';
import { EngagementService } from './application/engagement.service.js';
import { StudyDayProjectorService } from './application/study-day-projector.service.js';
import { EngagementController } from './engagement.controller.js';

@Module({
  controllers: [EngagementController],
  exports: [StudyDayProjectorService, EngagementService],
  imports: [DatabaseModule],
  providers: [StudyDayProjectorService, EngagementService],
})
export class EngagementModule {}
