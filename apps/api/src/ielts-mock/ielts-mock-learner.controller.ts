import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Post, Put, Query, Req, Res } from '@nestjs/common';
import { ApiConflictResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import type { IeltsMockAttemptDto, IeltsMockReportDto } from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import type { Response } from 'express';
import { sendAudioStream } from '../media/application/audio-stream-response.js';
import { Roles } from '../auth/roles.decorator.js';
import { MockAttemptClock } from './application/mock-attempt-clock.js';
import { MockSectionReviewService } from './application/mock-section-review.service.js';
import { IeltsMockLearnerService } from './application/ielts-mock-learner.service.js';
// Runtime DTO imports provide ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { IeltsMockClockOperationDto, IeltsMockRevisionDto, SaveIeltsMockResponsesDto, StartIeltsMockAttemptDto, SubmitIeltsMockSectionDto } from './dto/ielts-mock-learner.dto.js';

@ApiTags('IELTS Full Mock learner') @Roles('LEARNER') @Controller('me/ielts-mocks')
export class IeltsMockLearnerController {
  constructor(@Inject(IeltsMockLearnerService) private readonly mocks: IeltsMockLearnerService, @Inject(MockAttemptClock) private readonly clock: MockAttemptClock, @Inject(MockSectionReviewService) private readonly feedback: MockSectionReviewService) {}
  @Get() @ApiOperation({ summary: 'List eligible published IELTS mocks' }) catalog(@Req() request: AuthenticatedRequest) { return this.mocks.catalog(request.authUser.id); }
  @Post('attempts') @HttpCode(HttpStatus.OK) @ApiConflictResponse({ description: 'Band Pathway is required or mock is unavailable' }) start(@Req() request: AuthenticatedRequest, @Body() input: StartIeltsMockAttemptDto): Promise<IeltsMockAttemptDto> { return this.mocks.start(request.authUser.id, input); }
  @Get('attempts/:attemptId') @ApiOkResponse({ description: 'Owner-scoped immutable attempt' }) get(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string): Promise<IeltsMockAttemptDto> { return this.mocks.get(request.authUser.id, id); }
  @Put('attempts/:attemptId/responses') @ApiConflictResponse({ description: 'Attempt revision is stale' }) @ApiUnprocessableEntityResponse({ description: 'Response does not belong to current section' }) save(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string, @Body() input: SaveIeltsMockResponsesDto): Promise<IeltsMockAttemptDto> { return this.mocks.saveResponses(request.authUser.id, id, input); }
  @Post('attempts/:attemptId/sections/:section/submit') @HttpCode(HttpStatus.OK) submit(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string, @Param('section') section: SubmitIeltsMockSectionDto['section'], @Body() input: IeltsMockRevisionDto): Promise<IeltsMockAttemptDto> { return this.mocks.submitSection(request.authUser.id, id, { ...input, section }); }
  @Get('attempts/:attemptId/report') report(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string): Promise<IeltsMockReportDto> { return this.mocks.report(request.authUser.id, id); }
  @Get('attempts/:attemptId/audio/:assetId') async audio(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string, @Param('assetId', ParseUUIDPipe) assetId: string, @Res() response: Response, @Query('leaseId', new ParseUUIDPipe({ optional: true })) leaseId?: string): Promise<void> { const audio = await this.mocks.getAudio(request.authUser.id, id, assetId, leaseId); sendAudioStream(response, audio, audio.allowRange ? request.headers.range : undefined); }
  @Post('attempts/:attemptId/pause') @HttpCode(HttpStatus.OK) pause(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string, @Body() input: IeltsMockClockOperationDto) { return this.clock.pause(request.authUser.id, id, input); }
  @Post('attempts/:attemptId/resume') @HttpCode(HttpStatus.OK) resume(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string, @Body() input: IeltsMockClockOperationDto) { return this.clock.resume(request.authUser.id, id, input); }
  @Get('attempts/:attemptId/sections/:section/review') review(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string, @Param('section') section: string) { return this.feedback.review(request.authUser.id, id, section); }

}
