import {
  Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Put, Req, Res,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { WritingDraft } from '@worklingo/contracts';
import type { Response } from 'express';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { ActivityDraftsService } from './application/activity-drafts.service.js';
import { LearnerAudioService } from './application/learner-audio.service.js';
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
// Runtime import is required so Nest can emit DTO metadata for ValidationPipe.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SaveActivityDraftDto } from './dto/save-activity-draft.dto.js';

@ApiTags('learning sessions')
@Controller()
export class LearningSessionsController {
  constructor(
    @Inject(LearningSessionsService) private readonly sessions: LearningSessionsService,
    @Inject(ActivityDraftsService) private readonly drafts: ActivityDraftsService,
    @Inject(LearnerAudioService) private readonly audio: LearnerAudioService,
  ) {}

  @Get('learning-sessions/:id/activities/:activityId/draft')
  getDraft(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
  ): Promise<WritingDraft | null> {
    return this.drafts.get(request.authUser.id, id, activityId);
  }

  @Put('learning-sessions/:id/activities/:activityId/draft')
  saveDraft(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() input: SaveActivityDraftDto,
  ): Promise<WritingDraft> {
    return this.drafts.save({
      activityId, expectedRevision: input.expectedRevision, learnerId: request.authUser.id,
      sessionId: id, text: input.text,
    });
  }

  @Delete('learning-sessions/:id/activities/:activityId/draft')
  @HttpCode(204)
  deleteDraft(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
  ): Promise<void> {
    return this.drafts.delete(request.authUser.id, id, activityId);
  }

  @Get('learning-sessions/:id/activities/:activityId/audio')
  async streamActivityAudio(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Res() response: Response,
  ): Promise<void> {
    const audio = await this.audio.getActivityAudio(request.authUser.id, id, activityId);
    response.setHeader('Content-Type', audio.mimeType);
    response.setHeader('Content-Length', audio.byteSize);
    response.setHeader('Accept-Ranges', 'bytes');
    response.end(audio.body);
  }

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
