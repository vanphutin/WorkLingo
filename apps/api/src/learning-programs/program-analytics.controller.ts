import { Controller, Get, Inject, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { ProgramAnalyticsService } from './application/program-analytics.service.js';

@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@ApiTags('Program analytics')
@ApiResponse({ status: 200, description: 'Bounded aggregate analytics with explicit definitions' })
@ApiResponse({ status: 403, description: 'Active content or system administrator required' })
@Controller('admin/learning-programs')
export class ProgramAnalyticsController {
  constructor(@Inject(ProgramAnalyticsService) private readonly analytics: ProgramAnalyticsService) {}
  @Get(':id/analytics')
  @ApiOperation({ summary: 'Read aggregate program and release analytics for a bounded UTC window' })
  aggregate(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Query() query: unknown) {
    return this.analytics.aggregate(req.authUser.id, id, query);
  }
}
