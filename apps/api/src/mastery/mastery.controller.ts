import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { MasteryService } from './application/mastery.service.js';
// Runtime imports for ValidationPipe / Swagger
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ErrorBankQueryDto } from './dto/error-bank-query.dto.js';
import { ErrorBankResponseDto } from './dto/error-bank-response.dto.js';
import { MemoryHealthResponseDto } from './dto/memory-health-response.dto.js';
import { MasteryMapService } from './application/mastery-map.service.js';
import { MasteryMapResponseDto } from './dto/mastery-map-response.dto.js';

@ApiTags('mastery')
@Controller('me')
export class MasteryController {
  constructor(
    @Inject(MasteryService) private readonly mastery: MasteryService,
    @Inject(MasteryMapService) private readonly map: MasteryMapService,
  ) {}

  @Get('mastery-map')
  @ApiOperation({ summary: 'Get current curriculum blocks with learner-owned four-skill evidence' })
  @ApiOkResponse({ type: MasteryMapResponseDto })
  getMap(@Req() request: AuthenticatedRequest): Promise<MasteryMapResponseDto> {
    return this.map.getMap(request.authUser.id);
  }

  @Get('error-bank')
  @ApiOperation({ summary: 'Get paginated Error Bank entries for the authenticated learner' })
  @ApiOkResponse({ type: ErrorBankResponseDto })
  getErrorBank(
    @Req() request: AuthenticatedRequest,
    @Query() query: ErrorBankQueryDto,
  ): Promise<ErrorBankResponseDto> {
    return this.mastery.getErrorBank(request.authUser.id, query);
  }

  @Get('memory-health')
  @ApiOperation({ summary: 'Get deterministic Memory Health breakdown for the authenticated learner' })
  @ApiOkResponse({ type: MemoryHealthResponseDto })
  getMemoryHealth(
    @Req() request: AuthenticatedRequest,
  ): Promise<MemoryHealthResponseDto> {
    return this.mastery.getMemoryHealth(request.authUser.id);
  }
}
