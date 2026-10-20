import { ConflictException, HttpException, Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { curriculumRoadmapSchema, engagementSummarySchema, learnerDashboardAnalyticsSchema, learnerProgressDtoSchema,
  learnerTopicSchema, sessionAvailabilitySchema, type DashboardOverview } from '@worklingo/contracts';
import { ProgramContextService } from '../learning-programs/application/program-context.service.js';
import { ProgressService } from '../progress/application/progress.service.js';
import { LearningSessionsService } from '../learning-sessions/application/learning-sessions.service.js';
import { CurriculumProgressService } from '../curriculum-foundation/application/curriculum-progress.service.js';
import { DashboardAnalyticsService } from '../analytics/application/dashboard-analytics.service.js';
import { EngagementService } from '../engagement/application/engagement.service.js';
import { IntermediateTopicsService } from '../intermediate-topics/intermediate-topics.service.js';

async function section<T>(load: () => Promise<unknown>, schema: z.ZodType<T>): Promise<{ status: 'ready'; data: T } | { status: 'error'; error: { code: string; status: number } }> {
  try { return { status: 'ready', data: schema.parse(await load()) }; }
  catch (error) {
    if (error instanceof HttpException && [401, 403].includes(error.getStatus())) throw error;
    const status = error instanceof HttpException ? error.getStatus() : 503;
    const response = error instanceof HttpException ? error.getResponse() : null;
    const code = status < 500 && response && typeof response === 'object' && 'code' in response && typeof response.code === 'string'
      ? response.code : 'DASHBOARD_SECTION_UNAVAILABLE';
    return { status: 'error', error: { code, status } };
  }
}
@Injectable()
export class DashboardOverviewService {
  constructor(@Inject(ProgramContextService) private readonly context: ProgramContextService,
    @Inject(ProgressService) private readonly progress: ProgressService,
    @Inject(LearningSessionsService) private readonly sessions: LearningSessionsService,
    @Inject(CurriculumProgressService) private readonly roadmap: CurriculumProgressService,
    @Inject(DashboardAnalyticsService) private readonly analytics: DashboardAnalyticsService,
    @Inject(EngagementService) private readonly engagement: EngagementService,
    @Inject(IntermediateTopicsService) private readonly topics: IntermediateTopicsService) {}

  async get(learnerId: string): Promise<DashboardOverview> {
    const programContext = await this.context.getContext(learnerId);
    const active = Boolean(programContext.activeProgram);
    const [progress, availability, roadmap, analytics, engagement, topics] = await Promise.all([
      section(() => active ? this.progress.getProgress(learnerId) : Promise.resolve(null), learnerProgressDtoSchema.nullable()),
      section(() => active ? this.sessions.getAvailability(learnerId) : Promise.resolve(null), sessionAvailabilitySchema.nullable()),
      section(() => active ? this.roadmap.getRoadmap(learnerId) : Promise.resolve(null), curriculumRoadmapSchema.nullable()),
      section(() => this.analytics.learner(learnerId), learnerDashboardAnalyticsSchema),
      section(() => this.engagement.getSummary(learnerId), engagementSummarySchema),
      section(() => programContext.activeProgram?.slug === 'intermediate' ? this.topics.list(learnerId) : Promise.resolve([]), z.array(learnerTopicSchema)),
    ]);
    // Do not paint one learner's new program with data fetched under the old context.
    const latest = await this.context.getContext(learnerId);
    if (latest.activeProgram?.id !== programContext.activeProgram?.id || latest.enrollment?.revision !== programContext.enrollment?.revision) {
      throw new ConflictException({ code: 'PROGRAM_CONTEXT_CHANGED', message: 'Program changed while loading the dashboard. Retry.' });
    }
    return { programContext, progress, availability, roadmap, analytics, engagement, topics };
  }
}
