import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { IeltsFlowService } from './application/ielts-flow.service.js';
@Roles('LEARNER') @ApiTags('IELTS flow') @Controller('me')
export class IeltsFlowController {
  constructor(@Inject(IeltsFlowService) private readonly flow:IeltsFlowService) {}
  @Get('ielts-overview') @ApiOperation({summary:'Read independent IELTS entries and owned resume links'}) overview(@Req() req:AuthenticatedRequest) {return this.flow.overview(req.authUser.id);}
  @Get('ielts-history') @ApiOperation({summary:'Read a bounded owner-scoped IELTS history'}) history(@Req() req:AuthenticatedRequest,@Query() query:Record<string,string>) {return this.flow.history(req.authUser.id,query);}
}
