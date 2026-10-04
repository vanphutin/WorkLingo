import { Controller, Get, Inject, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { ProgressService, type LearnerProgressDto } from './application/progress.service.js';

class LearnerProgressResponseDto {
  @ApiProperty() activityAttempts!: number;
  @ApiProperty() completedActivities!: number;
  @ApiProperty({ nullable: true }) currentLevelCode!: string | null;
  @ApiProperty({ additionalProperties: true, type: 'object' }) sessions!: object;
}

@ApiTags('progress')
@Controller('me')
export class ProgressController {
  constructor(@Inject(ProgressService) private readonly progress: ProgressService) {}

  @Get('progress')
  @ApiOperation({ summary: 'Get the current learner progress summary' })
  @ApiOkResponse({ type: LearnerProgressResponseDto })
  getProgress(@Req() request: AuthenticatedRequest): Promise<LearnerProgressDto> {
    return this.progress.getProgress(request.authUser.id);
  }
}
