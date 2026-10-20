import { Controller, Get, Inject, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AdminDashboardOverview, LearnerDashboardAnalytics } from '@worklingo/contracts';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { DashboardAnalyticsService } from './application/dashboard-analytics.service.js';

@ApiTags('dashboard analytics')
@Controller()
export class DashboardController {
  constructor(@Inject(DashboardAnalyticsService) private readonly dashboard: DashboardAnalyticsService) {}

  @Get('admin/analytics/overview')
  @Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Read stored program and learner aggregates; activity uses 14 UTC dates' })
  @ApiOkResponse({ description: 'Aggregate-only Admin dashboard; completion rate excludes planned and placement sessions' })
  overview(): Promise<AdminDashboardOverview> { return this.dashboard.overview(); }

  @Get('me/dashboard')
  @Roles('LEARNER')
  @ApiOperation({ summary: 'Read own program progress and active-program analytics for 14 UTC dates' })
  @ApiOkResponse({ description: 'Learner dashboard; scores represent evaluated activities, not TOEIC/IELTS estimates' })
  learner(@Req() request: AuthenticatedRequest): Promise<LearnerDashboardAnalytics> { return this.dashboard.learner(request.authUser.id); }
}
