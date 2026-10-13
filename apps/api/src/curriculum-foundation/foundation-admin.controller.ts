import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Put, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { FoundationCurriculumService } from './application/foundation-curriculum.service.js';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { FoundationCommandDto, SaveFoundationDraftDto } from './dto/foundation-command.dto.js';

@ApiTags('foundation curriculum')
@ApiResponse({ status: 403, description: 'Content Admin or System Admin required' })
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@Controller('admin/curriculum')
export class FoundationAdminController {
  constructor(@Inject(FoundationCurriculumService) private readonly service: FoundationCurriculumService) {}
  @Get('missions/:missionId/foundation')
  @ApiOperation({ summary: 'Read foundation draft and published revisions' })
  get(@Param('missionId', ParseUUIDPipe) id: string) { return this.service.getDraft(id); }
  @Put('missions/:missionId/foundation') @HttpCode(200)
  @ApiOperation({ summary: 'Save foundation draft' })
  save(@Param('missionId', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest, @Body() input: SaveFoundationDraftDto) { return this.service.saveDraft(id, req.authUser.id, input); }
  @Post('missions/:missionId/foundation/validate') @HttpCode(200)
  @ApiOperation({ summary: 'Validate current foundation draft' })
  validate(@Param('missionId', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest, @Body() input: FoundationCommandDto) { return this.service.validateDraft(id, req.authUser.id, input); }
  @Post('missions/:missionId/foundation/publish') @HttpCode(200)
  @ApiOperation({ summary: 'Publish an immutable foundation revision' })
  publish(@Param('missionId', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest, @Body() input: FoundationCommandDto) { return this.service.publishDraft(id, req.authUser.id, input); }
  @Post('foundation-revisions/:id/archive') @HttpCode(200)
  @ApiOperation({ summary: 'Archive a foundation revision without breaking dependents' })
  archive(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest, @Body() input: FoundationCommandDto) { return this.service.archiveRevision(id, req.authUser.id, input); }
}
