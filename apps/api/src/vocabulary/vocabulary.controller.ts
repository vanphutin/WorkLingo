import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { VocabularySourcesService } from './vocabulary-sources.service.js';
import { VocabularyImportsService } from './vocabulary-imports.service.js';
import { VocabularyLibraryService } from './vocabulary-library.service.js';
import * as dto from './vocabulary.dto.js';

@ApiTags('admin vocabulary')
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Content or system administrator required' })
@ApiOkResponse({ description: 'Validated vocabulary admin response' })
@Controller('admin/vocabulary')
export class VocabularyController {
  constructor(@Inject(VocabularySourcesService) private readonly sources: VocabularySourcesService,
    @Inject(VocabularyImportsService) private readonly imports: VocabularyImportsService,
    @Inject(VocabularyLibraryService) private readonly library: VocabularyLibraryService) {}

  @Get('entries') @ApiOperation({ summary: 'Search rights-authorized lexical entries' })
  search(@Query(new dto.VocabularyInputPipe(dto.queryDto)) query: dto.QueryDto) { return this.library.search(query); }
  @Get('entries/:id') @ApiOperation({ summary: 'Read entry meanings and immutable provenance' })
  detail(@Param('id', ParseUUIDPipe) id: string) { return this.library.detail(id); }
  @Get('entries/:id/provenance') @ApiOperation({ summary: 'Read ordered, bounded immutable entry provenance' })
  provenance(@Param('id', ParseUUIDPipe) id: string, @Query(new dto.VocabularyInputPipe(dto.pageDto)) query: dto.PageDto) { return this.library.provenance(id, query.page, query.limit); }
  @Get('sources') @ApiOperation({ summary: 'List source metadata and authorization states' })
  listSources(@Query(new dto.VocabularyInputPipe(dto.pageDto)) query: dto.PageDto) { return this.sources.list(query.page, query.limit); }
  @Post('sources') @ApiOperation({ summary: 'Register source metadata without approving reuse' })
  source(@Body(new dto.VocabularyInputPipe(dto.sourceDto)) input: dto.SourceDto) { return this.sources.register(input); }
  @Patch('sources/:id/rights') @ApiOperation({ summary: 'Record current reuse authorization with revision check' })
  rights(@Param('id', ParseUUIDPipe) id: string, @Body(new dto.VocabularyInputPipe(dto.rightsDto)) input: dto.RightsDto) { return this.sources.rights(id, input); }
  @Post('documents') @ApiOperation({ summary: 'Register immutable exact-document metadata' })
  document(@Body(new dto.VocabularyInputPipe(dto.documentDto)) input: dto.DocumentDto) { return this.sources.document(input); }
  @Get('batches') @ApiOperation({ summary: 'List bounded import metadata' })
  listBatches(@Query(new dto.VocabularyInputPipe(dto.pageDto)) query: dto.PageDto) { return this.imports.list(query.page, query.limit); }
  @Post('batches') @ApiOperation({ summary: 'Register a parser inventory and resumable batch' })
  start(@Body(new dto.VocabularyInputPipe(dto.batchDto)) input: dto.BatchDto) { return this.imports.start(input); }
  @Get('batches/:id') @ApiOperation({ summary: 'Read authorized source rows and reconciliation counts' })
  batch(@Param('id', ParseUUIDPipe) id: string, @Query(new dto.VocabularyInputPipe(dto.pageDto)) query: dto.PageDto) { return this.imports.detail(id, query.page, query.limit); }
  @Post('batches/:id/stage') @HttpCode(200) @ApiOperation({ summary: 'Stage at most 250 immutable source rows' })
  stage(@Param('id', ParseUUIDPipe) id: string, @Body(new dto.VocabularyInputPipe(dto.stageDto)) input: dto.StageDto) { return this.imports.stage(id, input); }
  @Post('batches/:id/review') @HttpCode(200) @ApiOperation({ summary: 'Record an explicit human source-row decision' })
  review(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body(new dto.VocabularyInputPipe(dto.reviewDto)) input: dto.ReviewDto) { return this.imports.review(id, request.authUser.id, input); }
  @Post('batches/:id/publish') @HttpCode(200) @ApiOperation({ summary: 'Publish an atomically reconciled collection snapshot' })
  publish(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body(new dto.VocabularyInputPipe(dto.publishDto)) input: dto.PublishDto) { return this.imports.publish(id, request.authUser.id, input); }
  @Post('batches/:id/rollback') @HttpCode(200) @ApiOperation({ summary: 'Retire a batch while preserving all identities and snapshots' })
  rollback(@Param('id', ParseUUIDPipe) id: string, @Body(new dto.VocabularyInputPipe(dto.rollbackDto)) input: dto.RollbackDto) { return this.imports.rollback(id, input); }
  @Get('collections') @ApiOperation({ summary: 'List bounded collection metadata' })
  collections(@Query(new dto.VocabularyInputPipe(dto.pageDto)) query: dto.PageDto) { return this.library.collections(query.page, query.limit); }
  @Post('collections') @ApiOperation({ summary: 'Create collection metadata' })
  collection(@Body(new dto.VocabularyInputPipe(dto.collectionDto)) input: dto.CollectionDto) { return this.library.createCollection(input); }
  @Get('collections/:id/versions') @ApiOperation({ summary: 'Read rights-authorized ordered collection versions' })
  versions(@Param('id', ParseUUIDPipe) id: string, @Query(new dto.VocabularyInputPipe(dto.pageDto)) query: dto.PageDto) { return this.library.versions(id, query.page, query.limit); }
  @Get('versions/:id/members') @ApiOperation({ summary: 'Read ordered, bounded snapshot members' })
  members(@Param('id', ParseUUIDPipe) id: string, @Query(new dto.VocabularyInputPipe(dto.pageDto)) query: dto.PageDto) { return this.library.members(id, query.page, query.limit); }
  @Get('versions/:id/assignments') @ApiOperation({ summary: 'Read ordered, bounded snapshot program assignments' })
  assignments(@Param('id', ParseUUIDPipe) id: string, @Query(new dto.VocabularyInputPipe(dto.pageDto)) query: dto.PageDto) { return this.library.assignments(id, query.page, query.limit); }
  @Get('versions/:id/bindings') @ApiOperation({ summary: 'Read ordered, bounded snapshot curriculum bindings' })
  bindings(@Param('id', ParseUUIDPipe) id: string, @Query(new dto.VocabularyInputPipe(dto.pageDto)) query: dto.PageDto) { return this.library.bindings(id, query.page, query.limit); }
  @Post('collections/:id/versions') @ApiOperation({ summary: 'Create a draft version from explicit reviewed senses' })
  createVersion(@Param('id', ParseUUIDPipe) id: string, @Body(new dto.VocabularyInputPipe(dto.membersDto)) input: dto.MembersDto) { return this.library.createVersion(id, input); }
  @Post('versions/:id/publish') @HttpCode(200) @ApiOperation({ summary: 'Publish a hand-curated immutable version' })
  publishVersion(@Param('id', ParseUUIDPipe) id: string, @Body(new dto.VocabularyInputPipe(dto.emptyDto)) _input: Record<string, never>) { return this.library.publishVersion(id); }
  @Post('assignments') @ApiOperation({ summary: 'Assign reviewed membership to a real learning program' })
  assign(@Req() request: AuthenticatedRequest, @Body(new dto.VocabularyInputPipe(dto.programDto)) input: dto.ProgramDto) { return this.library.assign(request.authUser.id, input); }
  @Post('versions/:id/bindings') @ApiOperation({ summary: 'Bind a published version to one curriculum target' })
  bind(@Param('id', ParseUUIDPipe) id: string, @Body(new dto.VocabularyInputPipe(dto.bindingDto)) input: dto.BindingDto) { return this.library.bind(id, input); }
  @Post('legacy-links') @ApiOperation({ summary: 'Record reviewed legacy correspondence without editing learning identities' })
  legacy(@Req() request: AuthenticatedRequest, @Body(new dto.VocabularyInputPipe(dto.legacyDto)) input: dto.LegacyDto) { return this.library.legacyLink(request.authUser.id, input); }
  @Get('options') @ApiOperation({ summary: 'List bounded real program and topic choices' })
  options(@Query(new dto.VocabularyInputPipe(dto.optionsDto)) query: dto.OptionsDto) { return this.library.options(query); }
}
