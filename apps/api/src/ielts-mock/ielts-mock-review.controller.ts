import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { IeltsMockReviewService } from './application/ielts-mock-review.service.js';
// Runtime DTO imports provide ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ReviewIeltsMockAttemptDto } from './dto/ielts-mock-admin.dto.js';

@ApiTags('admin-ielts-mock-reviews') @Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN') @Controller('admin/ielts-mock-attempts')
export class IeltsMockReviewController {
  constructor(@Inject(IeltsMockReviewService) private readonly reviews: IeltsMockReviewService) {}
  @Get() listPending(@Query('cursor') cursor?: string) { return this.reviews.listPending(cursor); }
  @Post(':attemptId/reviews') review(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) attemptId: string, @Body() input: ReviewIeltsMockAttemptDto) { return this.reviews.review(request.authUser.id, attemptId, input); }
}
