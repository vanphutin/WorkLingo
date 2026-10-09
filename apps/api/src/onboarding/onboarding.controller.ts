import { Body, Controller, Get, HttpCode, Inject, Post, Req } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { OnboardingStateDto } from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { OnboardingService } from './application/onboarding.service.js';
// Runtime DTO import supplies ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SelfPlacementDto } from './dto/self-placement.dto.js';

@ApiTags('onboarding')
@Roles('LEARNER')
@Controller('me/onboarding')
export class OnboardingController {
  constructor(@Inject(OnboardingService) private readonly onboarding: OnboardingService) {}

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
}
