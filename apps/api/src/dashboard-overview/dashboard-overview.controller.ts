import { Controller, Get, Header, Inject, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { DashboardOverviewService } from './dashboard-overview.service.js';

@ApiTags('learner dashboard')
@Roles('LEARNER')
@Controller('me/dashboard')
export class DashboardOverviewController {
  constructor(@Inject(DashboardOverviewService) private readonly overview: DashboardOverviewService) {}
  @Get('overview') @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Load dashboard sections together, preserving independent section failures' })
  get(@Req() request: AuthenticatedRequest) { return this.overview.get(request.authUser.id); }
}
