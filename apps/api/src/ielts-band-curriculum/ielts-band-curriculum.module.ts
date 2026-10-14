import { Module } from '@nestjs/common';
import { IeltsBandAdminService } from './application/ielts-band-admin.service.js';
import { IeltsBandAdminController } from './ielts-band-admin.controller.js';
import { IeltsBandLearnerService } from './application/ielts-band-learner.service.js';
import { IeltsBandLearnerController } from './ielts-band-learner.controller.js';

@Module({ controllers: [IeltsBandAdminController, IeltsBandLearnerController], providers: [IeltsBandAdminService, IeltsBandLearnerService], exports: [IeltsBandAdminService, IeltsBandLearnerService] })
export class IeltsBandCurriculumModule {}
