import { Body, Controller, Get, Inject, Patch, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { EngagementSummaryDto } from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { EngagementService } from './application/engagement.service.js';
// Runtime DTO import supplies ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdateWeeklyTargetDto } from './dto/update-weekly-target.dto.js';

@ApiTags('engagement')
@Roles('LEARNER')
@Controller('me/engagement')
export class EngagementController {
  constructor(
    @Inject(EngagementService) private readonly engagement: EngagementService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get engagement summary and evidence of progress' })
  @ApiOkResponse({ description: 'Engagement summary and four-skill progress evidence' })
  getSummary(@Req() request: AuthenticatedRequest): Promise<EngagementSummaryDto> {
    return this.engagement.getSummary(request.authUser.id);
  }

  @Patch('weekly-target')
  @ApiOperation({ summary: 'Update weekly learning target days' })
  @ApiOkResponse({ description: 'Updated engagement summary' })
  updateWeeklyTarget(
    @Req() request: AuthenticatedRequest,
    @Body() input: UpdateWeeklyTargetDto,
  ): Promise<EngagementSummaryDto> {
    return this.engagement.updateWeeklyTarget(request.authUser.id, input.targetDays);
  }
}
