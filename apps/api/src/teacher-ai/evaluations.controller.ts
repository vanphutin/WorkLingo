import { Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { EvaluationDto } from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { EvaluationService } from './application/evaluation.service.js';
import { EvaluationResponseDto } from './dto/evaluation-response.dto.js';

@ApiTags('Teacher AI evaluations')
@Controller('attempts/:attemptId/evaluation')
export class EvaluationsController {
  constructor(@Inject(EvaluationService) private readonly evaluations: EvaluationService) {}

  @Get()
  @ApiOperation({ summary: 'Read learner-safe Teacher AI evaluation state' })
  @ApiOkResponse({ type: EvaluationResponseDto })
  get(
    @Req() request: AuthenticatedRequest,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
  ): Promise<EvaluationDto> {
    return this.evaluations.getForLearner(request.authUser.id, attemptId);
  }

  @Post('retry')
  @HttpCode(202)
  @ApiOperation({ summary: 'Retry a failed evaluation when source evidence is retained' })
  retry(
    @Req() request: AuthenticatedRequest,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
  ): Promise<EvaluationDto> {
    return this.evaluations.retryForLearner(request.authUser.id, attemptId);
  }
}
