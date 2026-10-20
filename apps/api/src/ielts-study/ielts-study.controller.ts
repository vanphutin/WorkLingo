import { Body, Controller, Get, Inject, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { IeltsStudyService } from './application/ielts-study.service.js';
import { IeltsStudyProgressService } from './application/ielts-study-progress.service.js';
// Runtime validation metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { StartIeltsTopicSessionDto } from './dto/ielts-study.dto.js';

@ApiTags('IELTS contextual study')
@ApiOkResponse({ description: 'Owned IELTS study data' })
@Roles('LEARNER')
@Controller('me/ielts-study')
export class IeltsStudyController {
  constructor(@Inject(IeltsStudyService) private readonly study: IeltsStudyService, @Inject(IeltsStudyProgressService) private readonly evidence: IeltsStudyProgressService) {}
  @Get('topics') @ApiOperation({ summary: 'Choose a published IELTS topic and authored duration' }) catalog(@Req() request: AuthenticatedRequest) { return this.study.catalog(request.authUser.id); }
  @Post('sessions') @ApiOperation({ summary: 'Create a real IELTS learning session with a pinned topic' }) start(@Req() request: AuthenticatedRequest, @Body() input: StartIeltsTopicSessionDto) { return this.study.start(request.authUser.id, input); }
  @Get('progress') @ApiOperation({ summary: 'Read actual IELTS practice, pending and stable skill evidence' }) progress(@Req() request: AuthenticatedRequest) { return this.evidence.progress(request.authUser.id); }
}
