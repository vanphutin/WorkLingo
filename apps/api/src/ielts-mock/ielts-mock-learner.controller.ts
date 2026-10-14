import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Post, Put, Req } from '@nestjs/common';
import { ApiConflictResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import type { IeltsMockAttemptDto, IeltsMockReportDto } from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { IeltsMockLearnerService } from './application/ielts-mock-learner.service.js';
import { SaveIeltsMockResponsesDto, StartIeltsMockAttemptDto, SubmitIeltsMockSectionDto } from './dto/ielts-mock-learner.dto.js';

@ApiTags('IELTS Full Mock learner') @Roles('LEARNER') @Controller('me/ielts-mocks')
export class IeltsMockLearnerController {
  constructor(@Inject(IeltsMockLearnerService) private readonly mocks: IeltsMockLearnerService) {}
  @Get() @ApiOperation({ summary: 'List eligible published IELTS mocks' }) catalog(@Req() request: AuthenticatedRequest) { return this.mocks.catalog(request.authUser.id); }
  @Post('attempts') @HttpCode(HttpStatus.OK) @ApiConflictResponse({ description: 'Band Pathway is required or mock is unavailable' }) start(@Req() request: AuthenticatedRequest, @Body() input: StartIeltsMockAttemptDto): Promise<IeltsMockAttemptDto> { return this.mocks.start(request.authUser.id, input); }
  @Get('attempts/:attemptId') @ApiOkResponse({ description: 'Owner-scoped immutable attempt' }) get(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string): Promise<IeltsMockAttemptDto> { return this.mocks.get(request.authUser.id, id); }
  @Put('attempts/:attemptId/responses') @ApiConflictResponse({ description: 'Attempt revision is stale' }) @ApiUnprocessableEntityResponse({ description: 'Response does not belong to current section' }) save(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string, @Body() input: SaveIeltsMockResponsesDto): Promise<IeltsMockAttemptDto> { return this.mocks.saveResponses(request.authUser.id, id, input); }
  @Post('attempts/:attemptId/sections/:section/submit') @HttpCode(HttpStatus.OK) submit(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string, @Param('section') section: SubmitIeltsMockSectionDto['section'], @Body() input: Omit<SubmitIeltsMockSectionDto, 'section'>): Promise<IeltsMockAttemptDto> { return this.mocks.submitSection(request.authUser.id, id, { ...input, section }); }
  @Get('attempts/:attemptId/report') report(@Req() request: AuthenticatedRequest, @Param('attemptId', ParseUUIDPipe) id: string): Promise<IeltsMockReportDto> { return this.mocks.report(request.authUser.id, id); }
}
