import { Module } from '@nestjs/common';
import { CurriculumModule } from '../curriculum/curriculum.module.js';
import { IeltsTopicAdminService } from './application/ielts-topic-admin.service.js';
import { IeltsTopicsAdminController } from './ielts-topics-admin.controller.js';
import { LearningSessionsModule } from '../learning-sessions/learning-sessions.module.js';
import { MasteryModule } from '../mastery/mastery.module.js';
import { IeltsStudyService } from './application/ielts-study.service.js';
import { IeltsStudyProgressService } from './application/ielts-study-progress.service.js';
import { IeltsStudyController } from './ielts-study.controller.js';

@Module({ imports: [CurriculumModule, LearningSessionsModule, MasteryModule], controllers: [IeltsTopicsAdminController, IeltsStudyController], providers: [IeltsTopicAdminService, IeltsStudyService, IeltsStudyProgressService], exports: [IeltsTopicAdminService, IeltsStudyService] })
export class IeltsStudyModule {}
