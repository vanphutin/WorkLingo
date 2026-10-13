import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Post, Put, Req, Res } from '@nestjs/common';
import { ApiConflictResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import type { OrientationLearnerStatusDto, OrientationProgressResult } from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { sendAudioStream } from '../media/application/audio-stream-response.js';
import { OrientationLearnerService } from './application/orientation-learner.service.js';
// Runtime DTO import provides ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { UpdateOrientationProgressDto } from './dto/learner-orientation.dto.js';

@ApiTags('IELTS orientation learner')
@Roles('LEARNER')
@Controller('me/ielts-orientation')
export class OrientationLearnerController {
  constructor(@Inject(OrientationLearnerService) private readonly orientation: OrientationLearnerService) {}

  @Get()
  @ApiOperation({ summary: 'Read IELTS orientation eligibility or pinned progress' })
  @ApiOkResponse({ description: 'Learner orientation state' })
  getStatus(@Req() request: AuthenticatedRequest): Promise<OrientationLearnerStatusDto> {
    return this.orientation.getStatus(request.authUser.id);
  }

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start or resume the immutable IELTS orientation version' })
  @ApiOkResponse({ description: 'Pinned learner orientation state' })
  @ApiConflictResponse({ description: 'Foundation evidence is incomplete' })
  start(@Req() request: AuthenticatedRequest): Promise<OrientationLearnerStatusDto> {
    return this.orientation.start(request.authUser.id);
  }

  @Put('progress')
  @ApiOperation({ summary: 'Persist slide progress and knowledge-check evidence' })
  @ApiOkResponse({ description: 'Updated optimistic progress' })
  @ApiConflictResponse({ description: 'Progress revision is stale or already completed' })
  @ApiUnprocessableEntityResponse({ description: 'Navigation or completion requirements are not met' })
  updateProgress(@Req() request: AuthenticatedRequest, @Body() input: UpdateOrientationProgressDto): Promise<OrientationProgressResult> {
    return this.orientation.updateProgress(request.authUser.id, input);
  }

  @Get('media/:assetId/content')
  @ApiOperation({ summary: 'Stream media referenced by the learner pinned orientation version' })
  async streamMedia(
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ): Promise<void> {
    const content = await this.orientation.getMedia(request.authUser.id, assetId);
    sendAudioStream(response, content, request.headers.range);
  }
}
