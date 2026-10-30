import { Body, Inject, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { ProgramVersionsService } from './application/program-versions.service.js';
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@ApiTags('Program releases')
@ApiResponse({ status: 403, description: 'Active program administrator required' })
@Controller('admin/learning-programs')
export class ProgramVersionsController {
  constructor(@Inject(ProgramVersionsService) private readonly versions: ProgramVersionsService) {}
  @Get(':id/authoring-options') @ApiOperation({ summary: 'List bounded published curriculum and lesson references' })
  options(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Query() query: unknown) { return this.versions.authoringOptions(req.authUser.id, id, query); }
  @Get(':id/versions') @ApiOperation({ summary: 'List exact program releases' })
  list(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Query() query: unknown) { return this.versions.listVersions(req.authUser.id, id, query); }
  @Post(':id/versions') @ApiOperation({ summary: 'Create a draft release' })
  create(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) { return this.versions.createDraft(req.authUser.id, id, body); }
  @Put(':id/versions/:versionId') @ApiOperation({ summary: 'Save an editable draft' })
  save(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Param('versionId', ParseUUIDPipe) versionId: string, @Body() body: unknown) { return this.versions.saveDraft(req.authUser.id, id, versionId, body); }
  @Post(':id/versions/:versionId/transition') @HttpCode(200) @ApiOperation({ summary: 'Review, approve, publish or retire a release' })
  transition(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Param('versionId', ParseUUIDPipe) versionId: string, @Body() body: unknown) { return this.versions.transition(req.authUser.id, id, versionId, body); }
  @Get(':id/versions/:versionId/preview') @ApiOperation({ summary: 'Preview a release snapshot' })
  preview(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Param('versionId', ParseUUIDPipe) versionId: string) { return this.versions.preview(req.authUser.id, id, versionId); }
  @Post(':id/archive') @HttpCode(200) @ApiOperation({ summary: 'Disable new enrollment discovery' })
  archive(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) { return this.versions.archive(req.authUser.id, id, body); }
  @Post(':id/rollback') @HttpCode(200) @ApiOperation({ summary: 'Create a draft from an historical release' })
  rollback(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) { return this.versions.rollback(req.authUser.id, id, body); }
  @Post(':id/duplicate') @ApiOperation({ summary: 'Duplicate authoring content with new identities' })
  duplicate(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) { return this.versions.duplicate(req.authUser.id, id, body); }
}
