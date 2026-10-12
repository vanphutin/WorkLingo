import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AdminPilotAnalyticsResponse } from '@worklingo/contracts';

import { Roles } from '../auth/roles.decorator.js';
import { PilotRetentionService } from './application/pilot-retention.service.js';
// Runtime import is required for Nest validation metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AdminAnalyticsQueryDto } from './dto/admin-analytics-query.dto.js';

@ApiTags('admin analytics')
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(
    @Inject(PilotRetentionService)
    private readonly retention: PilotRetentionService,
  ) {}

  @Get('pilot')
  @ApiOperation({ summary: 'Read bounded aggregate-only local pilot analytics' })
  @ApiOkResponse({ description: 'Daily aggregate metrics and cohort retention definitions' })
  summarize(
    @Query() query: AdminAnalyticsQueryDto,
  ): Promise<AdminPilotAnalyticsResponse> {
    return this.retention.summarize(query);
  }
}
