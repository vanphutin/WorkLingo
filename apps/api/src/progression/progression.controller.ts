import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CheckpointAssessment, ProgressionSummary } from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { ProgressionService } from './application/progression.service.js';
// Runtime DTO import supplies ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreateCheckpointAssessmentDto } from './dto/create-checkpoint-assessment.dto.js';

@ApiTags('progression')
@Controller('me')
export class ProgressionController {
  constructor(@Inject(ProgressionService) private readonly progression: ProgressionService) {}

  @Get('progression')
  @ApiOperation({ summary: 'Get checkpoint readiness for the authenticated learner' })
  @ApiOkResponse({ description: 'Current level, eligible session and latest checkpoint snapshot' })
  getSummary(@Req() request: AuthenticatedRequest): Promise<ProgressionSummary> {
    return this.progression.getSummary(request.authUser.id);
  }

  @Post('checkpoint-assessments')
  @ApiOperation({ summary: 'Assess server-owned evidence from a completed frozen session' })
  @ApiCreatedResponse({ description: 'Immutable checkpoint assessment and reinforcement snapshot' })
  assess(@Req() request: AuthenticatedRequest, @Body() input: CreateCheckpointAssessmentDto): Promise<CheckpointAssessment> {
    return this.progression.assess(request.authUser.id, input);
  }

  @Post('checkpoint-assessments/:id/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm a passed checkpoint and advance to the available immediate next level' })
  @ApiOkResponse({ description: 'Progression summary after transactional confirmation' })
  confirm(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string): Promise<ProgressionSummary> {
    return this.progression.confirm(request.authUser.id, id);
  }
}
