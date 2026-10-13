import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Post, Put, Req } from '@nestjs/common';
import { ApiConflictResponse, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AdminIeltsBridgeModuleDto, IeltsBridgeValidationResult, PublishIeltsBridgeResult } from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { IeltsBridgeAdminService } from './application/ielts-bridge-admin.service.js';
// Runtime imports provide ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { IeltsBridgeCommandDto, SaveIeltsBridgeDraftDto } from './dto/ielts-bridge-admin.dto.js';

@ApiTags('IELTS Bridge admin')
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@Controller('admin/ielts-bridge/modules')
export class IeltsBridgeAdminController {
  constructor(@Inject(IeltsBridgeAdminService) private readonly bridge: IeltsBridgeAdminService) {}

  @Get()
  @ApiOperation({ summary: 'List IELTS Bridge drafts and immutable version history' })
  @ApiOkResponse({ description: 'IELTS Bridge authoring catalog' })
  list(): Promise<AdminIeltsBridgeModuleDto[]> {
    return this.bridge.list();
  }

  @Get(':moduleId')
  @ApiOperation({ summary: 'Read one IELTS Bridge draft and version history' })
  get(@Param('moduleId', ParseUUIDPipe) moduleId: string): Promise<AdminIeltsBridgeModuleDto> {
    return this.bridge.get(moduleId);
  }

  @Post()
  @ApiOperation({ summary: 'Create an IELTS Bridge module draft' })
  @ApiCreatedResponse({ description: 'Created draft' })
  create(@Req() request: AuthenticatedRequest, @Body() input: SaveIeltsBridgeDraftDto): Promise<AdminIeltsBridgeModuleDto> {
    return this.bridge.saveDraft(request.authUser.id, null, input);
  }

  @Put(':moduleId/draft')
  @ApiOperation({ summary: 'Replace an IELTS Bridge draft using optimistic concurrency' })
  @ApiConflictResponse({ description: 'Draft revision is stale' })
  update(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: SaveIeltsBridgeDraftDto,
  ): Promise<AdminIeltsBridgeModuleDto> {
    return this.bridge.saveDraft(request.authUser.id, moduleId, input);
  }

  @Post(':moduleId/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate an IELTS Bridge draft' })
  validate(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() input: IeltsBridgeCommandDto,
  ): Promise<IeltsBridgeValidationResult> {
    return this.bridge.validate(moduleId, input);
  }

  @Post(':moduleId/publish')
  @ApiOperation({ summary: 'Publish an immutable IELTS Bridge version' })
  @ApiCreatedResponse({ description: 'Published version' })
  publish(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: IeltsBridgeCommandDto,
  ): Promise<PublishIeltsBridgeResult> {
    return this.bridge.publish(request.authUser.id, moduleId, input);
  }

  @Post(':moduleId/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive the current IELTS Bridge release' })
  archive(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<AdminIeltsBridgeModuleDto> {
    return this.bridge.archive(request.authUser.id, moduleId);
  }
}
