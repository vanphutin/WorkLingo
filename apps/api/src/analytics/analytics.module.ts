import { Global, Module } from '@nestjs/common';

import { DatabaseModule } from '../common/database/database.module.js';
import { AdminAnalyticsController } from './admin-analytics.controller.js';
import { PilotMetricsService } from './application/pilot-metrics.service.js';
import { PilotRetentionService } from './application/pilot-retention.service.js';
import { DashboardAnalyticsService } from './application/dashboard-analytics.service.js';
import { DashboardController } from './dashboard.controller.js';
import { LearningProgramsModule } from '../learning-programs/learning-programs.module.js';

@Global()
@Module({
  controllers: [AdminAnalyticsController, DashboardController],
  exports: [PilotMetricsService, DashboardAnalyticsService],
  imports: [DatabaseModule, LearningProgramsModule],
  providers: [PilotMetricsService, PilotRetentionService, DashboardAnalyticsService],
})
export class AnalyticsModule {}
