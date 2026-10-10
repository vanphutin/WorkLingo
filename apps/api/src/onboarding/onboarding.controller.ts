import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { OnboardingStateDto } from '@worklingo/contracts';
import type { PlacementAttemptDto } from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { OnboardingService } from './application/onboarding.service.js';
import { PlacementAttemptsService } from './application/placement-attempts.service.js';
import { PlacementRecommendationService } from './application/placement-recommendation.service.js';
// Runtime DTO import supplies ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ConfirmPlacementDto } from './dto/confirm-placement.dto.js';
// Runtime DTO import supplies ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CreatePlacementAttemptDto } from './dto/create-placement-attempt.dto.js';
// Runtime DTO import supplies ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SelfPlacementDto } from './dto/self-placement.dto.js';

@ApiTags('onboarding')
@Roles('LEARNER')
@Controller('me/onboarding')
export class OnboardingController {
  constructor(
    @Inject(OnboardingService) private readonly onboarding: OnboardingService,
    @Inject(PlacementAttemptsService) private readonly placementAttempts: PlacementAttemptsService,
    @Inject(PlacementRecommendationService) private readonly placementRecommendation: PlacementRecommendationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get resumable onboarding state for the authenticated learner' })
  @ApiOkResponse({ description: 'Current onboarding state and playable self-placement levels' })
  getState(@Req() request: AuthenticatedRequest): Promise<OnboardingStateDto> {
    return this.onboarding.getState(request.authUser.id);
  }

  @Post('self-placement')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm an eligible self-selected starting level' })
  @ApiOkResponse({ description: 'Completed onboarding state' })
  @ApiConflictResponse({ description: 'Idempotency conflict or onboarding already completed' })
  @ApiUnprocessableEntityResponse({ description: 'Selected level is not playable' })
  confirmSelfPlacement(
    @Req() request: AuthenticatedRequest,
    @Body() input: SelfPlacementDto,
  ): Promise<OnboardingStateDto> {
    return this.onboarding.confirmSelfPlacement(request.authUser.id, input);
  }

  @Post('placement-attempts')
  @ApiOperation({ summary: 'Create or resume a version-bound placement assessment' })
  createPlacementAttempt(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreatePlacementAttemptDto,
  ): Promise<PlacementAttemptDto> {
    return this.placementAttempts.create(request.authUser.id, input);
  }

  @Get('placement-attempts/:id')
  @ApiOperation({ summary: 'Refresh an owned placement attempt and return its next action' })
  getPlacementAttempt(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PlacementAttemptDto> {
    return this.placementRecommendation.refresh(request.authUser.id, id);
  }

  @Post('placement-attempts/:id/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm a placement recommendation exactly once' })
  @ApiOkResponse({ description: 'Completed onboarding state' })
  @ApiConflictResponse({ description: 'Recommendation unavailable, stale, or already confirmed' })
  confirmPlacement(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ConfirmPlacementDto,
  ): Promise<OnboardingStateDto> {
    return this.placementAttempts.confirm(request.authUser.id, id, input);
  }
}
