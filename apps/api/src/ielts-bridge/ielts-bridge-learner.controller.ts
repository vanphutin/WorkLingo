import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Post, Put, Req } from '@nestjs/common';
import { ApiConflictResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import type { IeltsBridgeCatalogDto, IeltsBridgeProgressResult, IeltsBridgeSessionDto } from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { IeltsBridgeLearnerService } from './application/ielts-bridge-learner.service.js';
// Runtime DTO import provides ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdateIeltsBridgeProgressDto } from './dto/ielts-bridge-learner.dto.js';

@ApiTags('IELTS Bridge learner')
@Roles('LEARNER')
@Controller('me/ielts-bridge')
export class IeltsBridgeLearnerController {
  constructor(@Inject(IeltsBridgeLearnerService) private readonly bridge: IeltsBridgeLearnerService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Read IELTS Bridge eligibility, published modules and pinned progress' })
  @ApiOkResponse({ description: 'Owner-scoped IELTS Bridge catalog' })
  catalog(@Req() request: AuthenticatedRequest): Promise<IeltsBridgeCatalogDto> {
    return this.bridge.catalog(request.authUser.id);
  }

  @Post('modules/:moduleId/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start or resume an immutable IELTS Bridge module version' })
  @ApiConflictResponse({ description: 'IELTS Orientation is incomplete' })
  start(
    @Req() request: AuthenticatedRequest,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ): Promise<IeltsBridgeSessionDto> {
    return this.bridge.start(request.authUser.id, moduleId);
  }

  @Get('modules/:moduleId/session')
  @ApiOperation({ summary: 'Resume the learner-pinned IELTS Bridge module version' })
  getSession(
    @Req() request: AuthenticatedRequest,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ): Promise<IeltsBridgeSessionDto> {
    return this.bridge.getSession(request.authUser.id, moduleId);
  }

  @Put('modules/:moduleId/progress')
  @ApiOperation({ summary: 'Start a timer or submit the current IELTS Bridge stage' })
  @ApiConflictResponse({ description: 'Progress revision is stale or stage already completed' })
  @ApiUnprocessableEntityResponse({ description: 'Stage, timer or answer requirements are not met' })
  updateProgress(
    @Req() request: AuthenticatedRequest,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() input: UpdateIeltsBridgeProgressDto,
  ): Promise<IeltsBridgeProgressResult> {
    return this.bridge.updateProgress(request.authUser.id, moduleId, input);
  }
}
