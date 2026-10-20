import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { IntermediateTopicsService } from './intermediate-topics.service.js';
import { TopicReviewService } from './topic-review.service.js';
import { TopicJsonRepairService } from './topic-json-repair.service.js';
// Runtime DTO imports provide metadata for the global ValidationPipe.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ApproveTopicDto, CreateTopicSessionDto, TopicReviewRequestDto, RepairTopicJsonDto } from './intermediate-topics.dto.js';

@ApiTags('intermediate topics')
@Roles('LEARNER')
@Controller('intermediate-topics')
export class IntermediateTopicsController {
  constructor(@Inject(IntermediateTopicsService) private readonly topics: IntermediateTopicsService) {}

  @Get() @ApiOperation({ summary: 'List eligible published topics for the current Intermediate level' })
  @ApiOkResponse({ description: 'Topics with approved durations' })
  list(@Req() request: AuthenticatedRequest) { return this.topics.list(request.authUser.id); }

  @Post('sessions') @ApiOperation({ summary: 'Start a chosen or server-selected Intermediate topic' })
  @ApiOkResponse({ description: 'Frozen topic learning session' })
  @RateLimit({ keyType: 'USER_AND_OPERATION', limit: 30, scope: 'intermediate-topics:sessions', windowSeconds: 60 })
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateTopicSessionDto) { return this.topics.create(request.authUser.id, input); }
}

@ApiTags('intermediate topic review')
@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
@ApiForbiddenResponse({ description: 'Content or system administrator required' })
@Controller('admin/intermediate-topics')
export class IntermediateTopicReviewController {
  constructor(@Inject(TopicReviewService) private readonly reviews: TopicReviewService,
    @Inject(TopicJsonRepairService) private readonly jsonRepair: TopicJsonRepairService) {}

  @Post('repair-json') @HttpCode(200) @ApiOperation({ summary: 'Propose a verified JSON formatting repair; never adds questions or saves content' })
  @ApiOkResponse({ description: 'Formatting-only candidate awaiting administrator acceptance' })
  @RateLimit({ keyType: 'USER_AND_OPERATION', limit: 5, scope: 'intermediate-topics:repair-json', windowSeconds: 60 })
  repairJson(@Req() request: AuthenticatedRequest, @Body() input: RepairTopicJsonDto) {
    return this.jsonRepair.repair(input.source, request.authUser.id);
  }

  @Get(':id/review') @ApiOperation({ summary: 'Read duration review for an Intermediate topic import' })
  @ApiOkResponse({ description: 'Current review; stale approvals are invalid' })
  get(@Param('id', ParseUUIDPipe) id: string) { return this.reviews.get(id); }

  @Post(':id/propose') @HttpCode(200) @ApiOperation({ summary: 'Ask AI to propose duration; never approves' })
  @ApiOkResponse({ description: 'Proposal saved if source and review revisions still match' })
  @RateLimit({ keyType: 'USER_AND_OPERATION', limit: 5, scope: 'intermediate-topics:propose', windowSeconds: 60 })
  propose(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() input: TopicReviewRequestDto) {
    return this.reviews.propose(id, request.authUser.id, input);
  }

  @Post(':id/approve') @HttpCode(200) @ApiOperation({ summary: 'Human approval of duration and all four allocations' })
  @ApiOkResponse({ description: 'Approved plan with human actor and time' })
  @RateLimit({ keyType: 'USER_AND_OPERATION', limit: 30, scope: 'intermediate-topics:approve', windowSeconds: 60 })
  approve(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() input: ApproveTopicDto) {
    return this.reviews.approve(id, request.authUser.id, input);
  }
}
