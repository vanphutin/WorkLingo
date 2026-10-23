import { Module } from '@nestjs/common';
import { DatabaseModule } from '../common/database/database.module.js';
import { CurriculumModule } from '../curriculum/curriculum.module.js';
import { CurriculumFoundationModule } from '../curriculum-foundation/curriculum-foundation.module.js';
import { LearningProgramsModule } from '../learning-programs/learning-programs.module.js';
import { LearningSessionsModule } from '../learning-sessions/learning-sessions.module.js';
import { AiSettingsService } from '../ai-gateway/application/ai-settings.service.js';
import { IntermediateTopicsController, IntermediateTopicReviewController } from './intermediate-topics.controller.js';
import { IntermediateTopicsService } from './intermediate-topics.service.js';
import { TopicReviewService } from './topic-review.service.js';
import { TopicProposalService } from './topic-proposal.service.js';
import { TopicJsonRepairService } from './topic-json-repair.service.js';
import { TopicGroupsController } from './topic-groups.controller.js';
import { TopicGroupsService } from './topic-groups.service.js';
import { TopicVocabularyService } from './topic-vocabulary.service.js';
import { TopicGenerationService } from './topic-generation.service.js';
import { TopicGenerationController } from './topic-generation.controller.js';

@Module({ imports: [DatabaseModule, CurriculumModule, CurriculumFoundationModule, LearningProgramsModule, LearningSessionsModule],
  exports: [IntermediateTopicsService],
  controllers: [IntermediateTopicsController, IntermediateTopicReviewController, TopicGroupsController, TopicGenerationController],
  providers: [IntermediateTopicsService, TopicReviewService, TopicProposalService, TopicJsonRepairService, AiSettingsService, TopicGroupsService, TopicGenerationService, TopicVocabularyService] })
export class IntermediateTopicsModule {}
