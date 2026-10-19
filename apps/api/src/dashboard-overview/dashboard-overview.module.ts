import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module.js';
import { ProgressModule } from '../progress/progress.module.js';
import { LearningProgramsModule } from '../learning-programs/learning-programs.module.js';
import { LearningSessionsModule } from '../learning-sessions/learning-sessions.module.js';
import { CurriculumFoundationModule } from '../curriculum-foundation/curriculum-foundation.module.js';
import { EngagementModule } from '../engagement/engagement.module.js';
import { IntermediateTopicsModule } from '../intermediate-topics/intermediate-topics.module.js';
import { DashboardOverviewController } from './dashboard-overview.controller.js';
import { DashboardOverviewService } from './dashboard-overview.service.js';
@Module({ imports: [AnalyticsModule, ProgressModule, LearningProgramsModule, LearningSessionsModule, CurriculumFoundationModule, EngagementModule, IntermediateTopicsModule],
  controllers: [DashboardOverviewController], providers: [DashboardOverviewService] })
export class DashboardOverviewModule {}
