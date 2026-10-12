import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AdminAuditPageDto } from '@worklingo/contracts';

import { Roles } from '../auth/roles.decorator.js';
import { AuditQueryService } from './application/audit-query.service.js';
// Runtime imports are required so Nest can emit DTO metadata for ValidationPipe.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AdminAuditFilterDto } from './dto/audit-query.dto.js';

@ApiTags('admin audit')
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@Controller('admin/audit-events')
export class AdminAuditController {
  constructor(
    @Inject(AuditQueryService)
    private readonly auditQueryService: AuditQueryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List audit events with cursor pagination and filters' })
  list(@Query() query: AdminAuditFilterDto): Promise<AdminAuditPageDto> {
    return this.auditQueryService.list(query);
  }
}
