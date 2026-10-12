import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { LearningProgramCatalogDto } from '@worklingo/contracts';

import { Roles } from '../auth/roles.decorator.js';
import { LearningProgramsService } from './application/learning-programs.service.js';

@ApiTags('learning-programs')
@Roles('LEARNER')
@Controller('learning-programs')
export class LearningProgramsController {
  constructor(
    @Inject(LearningProgramsService)
    private readonly learningPrograms: LearningProgramsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List learner-visible learning programs' })
  @ApiOkResponse({ description: 'Ordered learning program catalog' })
  listCatalog(): Promise<LearningProgramCatalogDto> {
    return this.learningPrograms.listCatalog();
  }
}
