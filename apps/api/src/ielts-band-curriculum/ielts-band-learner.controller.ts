import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Put, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { IeltsBandLearnerService } from './application/ielts-band-learner.service.js';
import { EvaluateIeltsBandPathwayDto, StartIeltsBandPathwayDto, UpdateIeltsBandTargetDto } from './dto/ielts-band-learner.dto.js';

@ApiTags('IELTS band pathway learner')
@Roles('LEARNER')
@Controller('me/ielts-band-pathway')
export class IeltsBandLearnerController {
  constructor(@Inject(IeltsBandLearnerService) private readonly pathway: IeltsBandLearnerService) {}
  @Get() @ApiOperation({ summary: 'Read band pathway availability and owner-scoped journey' }) availability(@Req() request: AuthenticatedRequest) { return this.pathway.availability(request.authUser.id); }
  @Post('start') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Start or resume a version-bound band pathway' }) start(@Req() request: AuthenticatedRequest, @Body() input: StartIeltsBandPathwayDto) { return this.pathway.start(request.authUser.id, input); }
  @Put('target') @ApiOperation({ summary: 'Update the learner target band without rewriting evidence' }) target(@Req() request: AuthenticatedRequest, @Body() input: UpdateIeltsBandTargetDto) { return this.pathway.updateTarget(request.authUser.id, input); }
  @Post('evaluate') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Evaluate completed Integrated Practice evidence' }) evaluate(@Req() request: AuthenticatedRequest, @Body() input: EvaluateIeltsBandPathwayDto) { return this.pathway.evaluate(request.authUser.id, input); }
}
