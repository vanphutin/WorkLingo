import { Controller, Get, Inject, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CurriculumRoadmapDto } from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { CurriculumProgressService } from './application/curriculum-progress.service.js';

@ApiTags('foundation curriculum')
@Roles('LEARNER')
@Controller('me')
export class CurriculumRoadmapController {
  constructor(@Inject(CurriculumProgressService) private readonly progress: CurriculumProgressService) {}

  @Get('curriculum-roadmap')
  @ApiOperation({ summary: 'Get server-authoritative curriculum availability and objective progress' })
  @ApiOkResponse({ description: 'Published curriculum roadmap for the active learner enrollment' })
  get(@Req() request: AuthenticatedRequest): Promise<CurriculumRoadmapDto> {
    return this.progress.getRoadmap(request.authUser.id);
  }
}
