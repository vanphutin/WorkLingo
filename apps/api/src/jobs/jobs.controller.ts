import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { JobDto } from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { JobsService } from './application/jobs.service.js';

@ApiTags('jobs')
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@Controller('jobs')
export class JobsController {
  constructor(@Inject(JobsService) private readonly jobsService: JobsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get background job status by ID' })
  @ApiOkResponse({ description: 'Job status record' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  getJob(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JobDto> {
    return this.jobsService.getJob(id, request.authUser.id);
  }
}
