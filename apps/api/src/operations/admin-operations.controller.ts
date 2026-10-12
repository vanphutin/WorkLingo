import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type {
  AdminJobDetailDto,
  AdminJobPageDto,
  AdminOperationsSummaryDto,
} from '@worklingo/contracts';

import { Roles } from '../auth/roles.decorator.js';
import { OperationsQueryService } from './application/operations-query.service.js';
// Runtime import is required so Nest can emit DTO metadata for ValidationPipe.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { OperationsQueryDto } from './dto/operations-query.dto.js';

@ApiTags('admin operations')
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@Controller('admin/operations')
export class AdminOperationsController {
  constructor(
    @Inject(OperationsQueryService)
    private readonly operationsQueryService: OperationsQueryService,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get system operations summary, queue depth and worker status' })
  @ApiOkResponse({ description: 'Operations health and queue summary' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  getSummary(): Promise<AdminOperationsSummaryDto> {
    return this.operationsQueryService.getSummary();
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List and filter background jobs with pagination' })
  @ApiOkResponse({ description: 'Paginated list of jobs' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  listJobs(@Query() query: OperationsQueryDto): Promise<AdminJobPageDto> {
    return this.operationsQueryService.listJobs(query);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get job detail, attempt history, and scrubbed payload' })
  @ApiOkResponse({ description: 'Job detail' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  getJobDetail(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminJobDetailDto> {
    return this.operationsQueryService.getJobDetail(id);
  }
}
