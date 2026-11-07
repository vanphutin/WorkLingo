import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Roles } from '../auth/roles.decorator.js';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { AssessmentHistoryService } from './application/assessment-history.service.js';
import { PrismaService } from '../common/database/prisma.service.js';
import { LanguageEvaluationPort } from '../ai-gateway/domain/language-evaluation.port.js';
import { NotFoundException } from '@nestjs/common';
export class RequestAssessmentDto {
  @IsUUID() idempotencyKey!: string;
  @IsOptional() @IsUUID() previousEvaluationId?: string;
}
export class AssessmentQueryDto {
  @IsUUID() attemptId!: string;
}
@ApiTags('Versioned assessments')
@Controller()
export class AssessmentsController {
  constructor(
    @Inject(AssessmentHistoryService)
    private readonly assessments: AssessmentHistoryService,
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(LanguageEvaluationPort) private readonly language: LanguageEvaluationPort,
  ) {}
  @Roles('CONTENT_ADMIN')
  @Get('admin/assessment-providers')
  @ApiOperation({ summary: 'Inspect configured assessment capabilities and observed health without provider probes' })
  providers() {
    return { capabilities: this.language.getAssessmentCapabilities?.() ?? null, health: this.language.getAssessmentHealth?.() ?? null };
  }
  @Get('me/assessment-mastery')
  @ApiOperation({
    summary:
      'Read separate four-skill assessment evidence and review recommendations',
  })
  mastery(@Req() req: AuthenticatedRequest) {
    return this.assessments.mastery(req.authUser.id);
  }
  @Get('attempts/:attemptId/assessments')
  @ApiOperation({ summary: 'Read owner-scoped versioned assessment history' })
  history(
    @Req() req: AuthenticatedRequest,
    @Param('attemptId', ParseUUIDPipe) id: string,
  ) {
    return this.assessments.history(req.authUser.id, id);
  }
  @Post('attempts/:attemptId/assessments')
  @HttpCode(202)
  @RateLimit({
    keyType: 'USER_AND_OPERATION',
    limit: 15,
    scope: 'assessment:request',
    windowSeconds: 60,
  })
  @ApiOperation({
    summary: 'Evaluate a persisted submission with an explicit idempotency key',
  })
  request(
    @Req() req: AuthenticatedRequest,
    @Param('attemptId', ParseUUIDPipe) id: string,
    @Body() input: RequestAssessmentDto,
  ) {
    return this.assessments.requestAssessment(
      req.authUser.id,
      id,
      input.idempotencyKey,
      input.previousEvaluationId,
    );
  }
  @Post('assessments/:runId/cancel')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Cancel an owned nonterminal assessment; terminal history stays immutable',
  })
  cancel(
    @Req() req: AuthenticatedRequest,
    @Param('runId', ParseUUIDPipe) id: string,
  ) {
    return this.assessments.cancel(req.authUser.id, id);
  }
  @Roles('CONTENT_ADMIN')
  @Get('admin/assessments')
  @ApiOperation({
    summary: 'Inspect authorized versioned assessment audit history',
  })
  async adminHistory(@Query() input: AssessmentQueryDto) {
    const learner = await this.owner(input.attemptId);
    return this.assessments.history(learner, input.attemptId, true);
  }
  @Roles('CONTENT_ADMIN')
  @Post('admin/attempts/:attemptId/assessments')
  @HttpCode(202)
  @RateLimit({
    keyType: 'USER_AND_OPERATION',
    limit: 10,
    scope: 'assessment:reevaluate',
    windowSeconds: 60,
  })
  @ApiOperation({
    summary: 'Append an authorized re-evaluation without overwriting history',
  })
  async reevaluate(
    @Param('attemptId', ParseUUIDPipe) id: string,
    @Body() input: RequestAssessmentDto,
  ) {
    return this.assessments.requestAssessment(
      await this.owner(id),
      id,
      input.idempotencyKey,
      input.previousEvaluationId,
    );
  }
  private async owner(id: string) {
    const attempt = await this.database.activityAttempt.findUnique({
      where: { id },
      select: { learnerId: true },
    });
    if (!attempt) throw new NotFoundException('Assessment attempt not found');
    return attempt.learnerId;
  }
}
