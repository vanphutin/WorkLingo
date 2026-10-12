import { Global, Module } from '@nestjs/common';

import { DatabaseModule } from '../common/database/database.module.js';
import { AdminAnalyticsController } from './admin-analytics.controller.js';
import { PilotMetricsService } from './application/pilot-metrics.service.js';
import { PilotRetentionService } from './application/pilot-retention.service.js';

@Global()
@Module({
  controllers: [AdminAnalyticsController],
  exports: [PilotMetricsService],
  imports: [DatabaseModule],
  providers: [PilotMetricsService, PilotRetentionService],
})
export class AnalyticsModule {}
