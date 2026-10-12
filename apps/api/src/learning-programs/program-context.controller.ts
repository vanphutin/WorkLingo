import { Body, Controller, Get, Inject, Put, Req } from '@nestjs/common';
import { ApiConflictResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import type { ProgramContextDto } from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { ProgramContextService } from './application/program-context.service.js';
// Runtime DTO import provides ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ActivateProgramDto } from './dto/activate-program.dto.js';

@ApiTags('learning-programs')
@Roles('LEARNER')
@Controller('me/program-context')
export class ProgramContextController {
  constructor(@Inject(ProgramContextService) private readonly context: ProgramContextService) {}

  @Get()
  @ApiOperation({ summary: 'Get the authenticated learner active program and enrollment' })
  @ApiOkResponse({ description: 'Current program context or unassigned pending context' })
  getContext(@Req() request: AuthenticatedRequest): Promise<ProgramContextDto> {
    return this.context.getContext(request.authUser.id);
  }

  @Put()
  @ApiOperation({ summary: 'Activate an available enrolled program using the current revision' })
  @ApiOkResponse({ description: 'Persisted active context' })
  @ApiConflictResponse({ description: 'Onboarding required, invalid context or stale revision' })
  @ApiUnprocessableEntityResponse({ description: 'Program is not available for activation' })
  activate(@Req() request: AuthenticatedRequest, @Body() input: ActivateProgramDto): Promise<ProgramContextDto> {
    return this.context.activate(request.authUser.id, input);
  }
}
