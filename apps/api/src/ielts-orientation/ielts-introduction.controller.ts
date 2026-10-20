import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Put, Query, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { sendAudioStream } from '../media/application/audio-stream-response.js';
import { IeltsIntroductionService } from './application/ielts-introduction.service.js';
// ValidationPipe needs runtime DTO metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { IntroductionQueryDto, VisitIeltsIntroductionDto } from './dto/ielts-introduction.dto.js';

@ApiTags('IELTS introduction')
@Roles('LEARNER')
@Controller('me/ielts-introduction')
export class IeltsIntroductionController {
  constructor(@Inject(IeltsIntroductionService) private readonly introduction: IeltsIntroductionService) {}
  @Get()
  @ApiOperation({ summary: 'Read and revisit IELTS introduction without earned progress' })
  @ApiOkResponse({ description: 'Pinned or current learner-safe slides' })
  get(@Req() request: AuthenticatedRequest, @Query() query: IntroductionQueryDto) { return this.introduction.get(request.authUser.id, query.versionId); }
  @Put('visit')
  @ApiOperation({ summary: 'Remember a freely selected introduction slide' })
  @ApiOkResponse({ description: 'Version-bound viewing record' })
  visit(@Req() request: AuthenticatedRequest, @Body() body: VisitIeltsIntroductionDto) { return this.introduction.visit(request.authUser.id, body); }
  @Get('media/:assetId')
  @ApiOperation({ summary: 'Stream referenced introduction media for an authorized version' })
  @ApiOkResponse({ description: 'Owned or current media bytes' })
  async media(@Req() request: AuthenticatedRequest, @Param('assetId', ParseUUIDPipe) assetId: string, @Query('versionId', ParseUUIDPipe) versionId: string, @Res() response: Response) {
    sendAudioStream(response, await this.introduction.getMedia(request.authUser.id, assetId, versionId), request.headers.range);
  }
}
