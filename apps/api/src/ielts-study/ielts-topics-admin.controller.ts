import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Put, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { IeltsTopicAdminService } from './application/ielts-topic-admin.service.js';
// ValidationPipe uses runtime DTO metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { IeltsTopicCommandDto, IeltsTopicRevisionDto, SaveIeltsTopicDraftDto } from './dto/ielts-topic-admin.dto.js';

@ApiTags('IELTS topic authoring')
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@ApiOkResponse({ description: 'Topic draft, qualification or publication' })
@Controller('admin/ielts-topics')
export class IeltsTopicsAdminController {
  constructor(@Inject(IeltsTopicAdminService) private readonly topics: IeltsTopicAdminService) {}
  @Get() @ApiOperation({ summary: 'List IELTS topics' }) list() { return this.topics.list(); }
  @Get(':id') @ApiOperation({ summary: 'Read draft and immutable versions' }) get(@Param('id', ParseUUIDPipe) id: string) { return this.topics.get(id); }
  @Post() @ApiOperation({ summary: 'Create an IELTS topic draft' }) create(@Req() request: AuthenticatedRequest, @Body() input: SaveIeltsTopicDraftDto) { return this.topics.saveDraft(request.authUser.id, null, input); }
  @Put(':id') @ApiOperation({ summary: 'Save IELTS topic with revision checks' }) save(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() input: SaveIeltsTopicDraftDto) { return this.topics.saveDraft(request.authUser.id, id, input); }
  @Post(':id/validate') @HttpCode(200) @ApiOperation({ summary: 'Validate real contextual lessons and durations' }) validate(@Param('id', ParseUUIDPipe) id: string, @Body() input: IeltsTopicRevisionDto) { return this.topics.validate(id, input); }
  @Post(':id/publish') @ApiOperation({ summary: 'Publish an immutable topic version' }) publish(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() input: IeltsTopicCommandDto) { return this.topics.publish(request.authUser.id, id, input); }
}
