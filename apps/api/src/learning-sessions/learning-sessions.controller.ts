import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { LearningSessionsService } from './application/learning-sessions.service.js';
import type {
  ActivityAttemptDto,
  LearnerActivityDto,
  LearningSessionDto,
  SessionAvailabilityDto,
} from './application/learning-session.types.js';
// Runtime import is required so Nest can emit DTO metadata for ValidationPipe.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateLearningSessionDto } from './dto/create-learning-session.dto.js';
import {
  ActivityAttemptResponseDto,
  LearnerActivityResponseDto,
  LearningSessionResponseDto,
  SessionAvailabilityResponseDto,
} from './dto/learning-session-response.dto.js';
// Runtime import is required so Nest can emit DTO metadata for ValidationPipe.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SubmitAttemptDto } from './dto/submit-attempt.dto.js';

@ApiTags('learning sessions')
@Controller()
export class LearningSessionsController {
  constructor(@Inject(LearningSessionsService) private readonly sessions: LearningSessionsService) {}

  @Post('learning-sessions')
  @ApiOperation({ summary: 'Create an idempotent 60-minute learning session' })
  @ApiCreatedResponse({ type: LearningSessionResponseDto })
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateLearningSessionDto): Promise<LearningSessionDto> {
    return this.sessions.createSession(request.authUser.id, input.durationMinutes, input.clientSessionId);
  }

  @Get('learning-sessions/availability')
  @ApiOperation({ summary: 'Get session duration availability for the published mission' })
  @ApiOkResponse({ type: SessionAvailabilityResponseDto })
  getAvailability(@Req() request: AuthenticatedRequest): Promise<SessionAvailabilityDto> {
    return this.sessions.getAvailability(request.authUser.id);
  }

  @Get('learning-sessions/:id')
  @ApiOperation({ summary: 'Read an owned learning session and its persisted checkpoint' })
  @ApiOkResponse({ type: LearningSessionResponseDto })
  get(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LearningSessionDto> {
    return this.sessions.getSession(request.authUser.id, id);
  }

  @Get('learning-sessions/:id/activities/:activityId')
  @ApiOperation({ summary: 'Read a learner-safe activity payload from an owned session' })
  @ApiOkResponse({ type: LearnerActivityResponseDto })
  getActivity(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
  ): Promise<LearnerActivityDto> {
    return this.sessions.getActivity(request.authUser.id, id, activityId);
  }

  @Post('learning-sessions/:id/start')
  @HttpCode(200)
  @ApiOperation({ summary: 'Start an owned planned session' })
  @ApiOkResponse({ type: LearningSessionResponseDto })
  start(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessions.startSession(request.authUser.id, id);
  }

  @Post('learning-sessions/:id/pause')
  @HttpCode(200)
  @ApiOperation({ summary: 'Pause an in-progress session at its persisted checkpoint' })
  @ApiOkResponse({ type: LearningSessionResponseDto })
  pause(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessions.pauseSession(request.authUser.id, id);
  }

  @Post('learning-sessions/:id/resume')
  @HttpCode(200)
  @ApiOperation({ summary: 'Resume an owned paused session' })
  @ApiOkResponse({ type: LearningSessionResponseDto })
  resume(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessions.resumeSession(request.authUser.id, id);
  }

  @Post('activities/:activityId/attempts')
  @ApiOperation({ summary: 'Persist and evaluate an idempotent activity attempt' })
  @ApiCreatedResponse({ type: ActivityAttemptResponseDto })
  submitAttempt(
    @Req() request: AuthenticatedRequest,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() input: SubmitAttemptDto,
  ): Promise<ActivityAttemptDto> {
    return this.sessions.submitAttempt(request.authUser.id, activityId, input);
  }
}
