import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  AdminCurriculumTreeDto,
  AdminLearningPathItemDto,
  AdminLevelItemDto,
  AdminMissionItemDto,
} from '@worklingo/contracts';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { AdminCurriculumCommandService } from './application/admin-curriculum-command.service.js';
import { AdminCurriculumQueryService } from './application/admin-curriculum-query.service.js';
// Runtime imports are required so Nest can emit DTO metadata for ValidationPipe.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  ArchiveLearningPathDto,
  ArchiveLevelDto,
  ArchiveMissionDto,
  CreateLearningPathDto,
  CreateLevelDto,
  CreateMissionDto,
  PublishLearningPathDto,
  PublishLevelDto,
  PublishMissionDto,
  ReorderCurriculumDto,
  ReplaceMissionLessonsDto,
  UpdateLearningPathDto,
  UpdateLevelDto,
  UpdateMissionDto,
} from './dto/curriculum-command.dto.js';

@ApiTags('admin curriculum')
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@Controller('admin/curriculum')
export class AdminCurriculumController {
  constructor(
    @Inject(AdminCurriculumCommandService)
    private readonly commandService: AdminCurriculumCommandService,
    @Inject(AdminCurriculumQueryService)
    private readonly queryService: AdminCurriculumQueryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get complete curriculum tree' })
  getTree(): Promise<AdminCurriculumTreeDto> {
    return this.queryService.getTree();
  }

  // Paths
  @Post('paths')
  @ApiOperation({ summary: 'Create a learning path' })
  createPath(
    @Req() req: AuthenticatedRequest,
    @Body() input: CreateLearningPathDto,
  ): Promise<AdminLearningPathItemDto> {
    return this.commandService.createPath(req.authUser.id, input);
  }

  @Patch('paths/:id')
  @ApiOperation({ summary: 'Update a learning path' })
  updatePath(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateLearningPathDto,
  ): Promise<AdminLearningPathItemDto> {
    return this.commandService.updatePath(id, req.authUser.id, input);
  }

  @Post('paths/:id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a learning path' })
  publishPath(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: PublishLearningPathDto,
  ): Promise<AdminLearningPathItemDto> {
    return this.commandService.publishPath(id, req.authUser.id, input);
  }

  @Post('paths/:id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a learning path' })
  archivePath(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ArchiveLearningPathDto,
  ): Promise<AdminLearningPathItemDto> {
    return this.commandService.archivePath(id, req.authUser.id, input);
  }

  @Put('paths/:id/level-order')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder levels within a path' })
  reorderLevels(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ReorderCurriculumDto,
  ): Promise<AdminLevelItemDto[]> {
    return this.commandService.reorderLevels(id, req.authUser.id, input);
  }

  // Levels
  @Post('levels')
  @ApiOperation({ summary: 'Create a level' })
  createLevel(
    @Req() req: AuthenticatedRequest,
    @Body() input: CreateLevelDto,
  ): Promise<AdminLevelItemDto> {
    return this.commandService.createLevel(req.authUser.id, input);
  }

  @Patch('levels/:id')
  @ApiOperation({ summary: 'Update a level' })
  updateLevel(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateLevelDto,
  ): Promise<AdminLevelItemDto> {
    return this.commandService.updateLevel(id, req.authUser.id, input);
  }

  @Post('levels/:id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a level' })
  publishLevel(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: PublishLevelDto,
  ): Promise<AdminLevelItemDto> {
    return this.commandService.publishLevel(id, req.authUser.id, input);
  }

  @Post('levels/:id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a level' })
  archiveLevel(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ArchiveLevelDto,
  ): Promise<AdminLevelItemDto> {
    return this.commandService.archiveLevel(id, req.authUser.id, input);
  }

  @Put('levels/:id/mission-order')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder missions within a level' })
  reorderMissions(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ReorderCurriculumDto,
  ): Promise<AdminMissionItemDto[]> {
    return this.commandService.reorderMissions(id, req.authUser.id, input);
  }

  // Missions
  @Post('missions')
  @ApiOperation({ summary: 'Create a mission' })
  createMission(
    @Req() req: AuthenticatedRequest,
    @Body() input: CreateMissionDto,
  ): Promise<AdminMissionItemDto> {
    return this.commandService.createMission(req.authUser.id, input);
  }

  @Patch('missions/:id')
  @ApiOperation({ summary: 'Update a mission' })
  updateMission(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateMissionDto,
  ): Promise<AdminMissionItemDto> {
    return this.commandService.updateMission(id, req.authUser.id, input);
  }

  @Post('missions/:id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a mission' })
  publishMission(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: PublishMissionDto,
  ): Promise<AdminMissionItemDto> {
    return this.commandService.publishMission(id, req.authUser.id, input);
  }

  @Post('missions/:id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a mission' })
  archiveMission(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ArchiveMissionDto,
  ): Promise<AdminMissionItemDto> {
    return this.commandService.archiveMission(id, req.authUser.id, input);
  }

  @Put('missions/:id/lessons')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replace lessons for a mission' })
  replaceMissionLessons(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ReplaceMissionLessonsDto,
  ): Promise<AdminMissionItemDto> {
    return this.commandService.replaceMissionLessons(id, req.authUser.id, input);
  }
}
