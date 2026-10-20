import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Post, Put, Query, Req, Res } from '@nestjs/common';
import type { IeltsMockAttemptDto, IeltsMockReportDto } from '@worklingo/contracts';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { sendAudioStream } from '../media/application/audio-stream-response.js';
import { MockAttemptClock } from './application/mock-attempt-clock.js';
import { MockSectionReviewService } from './application/mock-section-review.service.js';
import { IeltsMockLearnerService } from './application/ielts-mock-learner.service.js';
// Runtime DTO imports provide ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { IeltsMockClockOperationDto, IeltsMockRevisionDto, SaveIeltsMockResponsesDto, StartIeltsMockAttemptDto } from './dto/ielts-mock-learner.dto.js';

@Roles('LEARNER') @Controller('me/ielts-mock-attempts')
export class IeltsMockAttemptController {
  constructor(@Inject(IeltsMockLearnerService) private readonly mocks: IeltsMockLearnerService, @Inject(MockAttemptClock) private readonly clock: MockAttemptClock, @Inject(MockSectionReviewService) private readonly feedback: MockSectionReviewService) {}
  @Post() @HttpCode(HttpStatus.OK) start(@Req() request: AuthenticatedRequest, @Body() input: StartIeltsMockAttemptDto): Promise<IeltsMockAttemptDto> { return this.mocks.start(request.authUser.id, input); }
  @Get(':attemptId') get(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string): Promise<IeltsMockAttemptDto> { return this.mocks.get(request.authUser.id, id); }
  @Put(':attemptId/responses') save(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string, @Body() input: SaveIeltsMockResponsesDto): Promise<IeltsMockAttemptDto> { return this.mocks.saveResponses(request.authUser.id, id, input); }
  @Post(':attemptId/sections/:section/submit') @HttpCode(HttpStatus.OK) submitSection(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string, @Param('section') section: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING', @Body() input: IeltsMockRevisionDto): Promise<IeltsMockAttemptDto> { return this.mocks.submitSection(request.authUser.id, id, { ...input, section }); }
  @Post(':attemptId/submit') @HttpCode(HttpStatus.OK) submit(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string, @Body() input: IeltsMockRevisionDto): Promise<IeltsMockAttemptDto> { return this.mocks.submitSection(request.authUser.id, id, { ...input, section: 'SPEAKING' }); }
  @Get(':attemptId/report') report(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string): Promise<IeltsMockReportDto> { return this.mocks.report(request.authUser.id, id); }
  @Get(':attemptId/audio/:assetId') async audio(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string, @Param('assetId', ParseUUIDPipe) assetId: string, @Res() response: Response, @Query('leaseId', new ParseUUIDPipe({ optional: true })) leaseId?: string): Promise<void> { const audio = await this.mocks.getAudio(request.authUser.id, id, assetId, leaseId); sendAudioStream(response, audio, audio.allowRange ? request.headers.range : undefined); }
  @Post(':attemptId/pause') @HttpCode(HttpStatus.OK) pause(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string, @Body() input: IeltsMockClockOperationDto) { return this.clock.pause(request.authUser.id, id, input); }
  @Post(':attemptId/resume') @HttpCode(HttpStatus.OK) resume(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string, @Body() input: IeltsMockClockOperationDto) { return this.clock.resume(request.authUser.id, id, input); }
  @Get(':attemptId/sections/:section/review') review(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string, @Param('section') section: string) { return this.feedback.review(request.authUser.id, id, section); }

}
