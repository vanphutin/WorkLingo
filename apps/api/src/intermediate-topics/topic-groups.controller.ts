import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiConflictResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator.js';
import { TopicGroupsService } from './topic-groups.service.js';
// Runtime imports preserve global ValidationPipe metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AssignTopicGroupDto, CreateTopicGroupDto, DeleteTopicGroupDto, UpdateTopicGroupDto } from './topic-groups.dto.js';

@ApiTags('intermediate topic groups')
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@ApiForbiddenResponse({ description: 'Content or system administrator required' })
@ApiConflictResponse({ description: 'Name collision or stale revision; refresh the catalog before retrying' })
@Controller('admin/intermediate-topic-groups')
export class TopicGroupsController {
  constructor(@Inject(TopicGroupsService) private readonly groups: TopicGroupsService) {}

  @Get() @ApiOperation({ summary: 'List topic groups and saved topic imports, including drafts' })
  @ApiOkResponse({ description: 'Topic group catalog' })
  catalog() { return this.groups.catalog(); }

  @Post() @ApiOperation({ summary: 'Create an Intermediate topic group' })
  @ApiCreatedResponse({ description: 'Created IntermediateTopicGroup: id, name, description, revision, lessonCount' })
  create(@Body() input: CreateTopicGroupDto) { return this.groups.create(input); }

  @Patch(':id') @ApiOperation({ summary: 'Update group metadata using its current revision' })
  @ApiOkResponse({ description: 'Updated IntermediateTopicGroup: id, name, description, revision, lessonCount' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() input: UpdateTopicGroupDto) { return this.groups.update(id, input); }

  @Delete(':id') @ApiOperation({ summary: 'Delete a group and detach its lessons without deleting content' })
  @ApiOkResponse({ description: 'Refreshed topic group catalog' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Body() input: DeleteTopicGroupDto) { return this.groups.remove(id, input); }

  @Put('lessons/:importId') @ApiOperation({ summary: 'Assign or clear a saved topic import and its related logical lesson' })
  @ApiOkResponse({ description: 'Refreshed catalog with new lesson assignment revisions' })
  assign(@Param('importId', ParseUUIDPipe) importId: string, @Body() input: AssignTopicGroupDto) { return this.groups.assign(importId, input); }
}
