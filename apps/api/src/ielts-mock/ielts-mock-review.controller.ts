import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { sendAudioStream } from '../media/application/audio-stream-response.js';
import { MockRecordingService } from './application/mock-recording.service.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { IeltsMockReviewService } from './application/ielts-mock-review.service.js';
// Runtime DTO imports provide ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ReviewIeltsMockAttemptDto } from './dto/ielts-mock-admin.dto.js';

@ApiTags('admin-ielts-mock-reviews') @Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN') @Controller('admin/ielts-mock-attempts')
export class IeltsMockReviewController {
  constructor(@Inject(IeltsMockReviewService) private readonly reviews: IeltsMockReviewService, @Inject(MockRecordingService) private readonly recordings: MockRecordingService) {}
  @Get() listPending(@Query('cursor') cursor?: string) { return this.reviews.listPending(cursor); }
  @Post(':attemptId/reviews') review(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) attemptId: string, @Body() input: ReviewIeltsMockAttemptDto) { return this.reviews.review(request.authUser.id, attemptId, input); }
  @Get(':attemptId/recordings/:recordingId/content') async recording(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) attemptId: string, @Param('recordingId', ParseUUIDPipe) recordingId: string, @Res() response: Response) { sendAudioStream(response, await this.recordings.read(request.authUser.id, attemptId, recordingId, true), request.headers.range); }

}
