import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Post, Put, Req } from '@nestjs/common';
import { ApiConflictResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import type { IeltsIntegratedAvailabilityDto, IeltsIntegratedProgressResult, IeltsIntegratedSessionDto } from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { IeltsIntegratedLearnerService } from './application/ielts-integrated-learner.service.js';
// Runtime DTO imports provide ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { StartIeltsIntegratedSessionDto, UpdateIeltsIntegratedProgressDto } from './dto/ielts-integrated-learner.dto.js';

@ApiTags('IELTS Integrated Practice learner')
@Roles('LEARNER')
@Controller('me/ielts-integrated')
export class IeltsIntegratedLearnerController {
  constructor(@Inject(IeltsIntegratedLearnerService) private readonly practice: IeltsIntegratedLearnerService) {}

  @Get('availability')
  @ApiOperation({ summary: 'Read Integrated Practice eligibility and available profiles' })
  @ApiOkResponse({ description: 'Owner-scoped availability and resumable session' })
  availability(@Req() request: AuthenticatedRequest): Promise<IeltsIntegratedAvailabilityDto> {
    return this.practice.availability(request.authUser.id);
  }

  @Post('sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start or idempotently resume an immutable four-skill session' })
  @ApiConflictResponse({ description: 'Bridge is incomplete or the profile is unavailable' })
  start(@Req() request: AuthenticatedRequest, @Body() input: StartIeltsIntegratedSessionDto): Promise<IeltsIntegratedSessionDto> {
    return this.practice.start(request.authUser.id, input);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Resume an owner-scoped Integrated Practice session' })
  get(@Req() request: AuthenticatedRequest, @Param('sessionId', ParseUUIDPipe) sessionId: string): Promise<IeltsIntegratedSessionDto> {
    return this.practice.get(request.authUser.id, sessionId);
  }

  @Put('sessions/:sessionId/progress')
  @ApiOperation({ summary: 'Submit the current skill block with optimistic concurrency' })
  @ApiConflictResponse({ description: 'Session revision is stale or already complete' })
  @ApiUnprocessableEntityResponse({ description: 'Block is locked or answer is invalid' })
  update(@Req() request: AuthenticatedRequest, @Param('sessionId', ParseUUIDPipe) sessionId: string, @Body() input: UpdateIeltsIntegratedProgressDto): Promise<IeltsIntegratedProgressResult> {
    return this.practice.update(request.authUser.id, sessionId, input);
  }
}
