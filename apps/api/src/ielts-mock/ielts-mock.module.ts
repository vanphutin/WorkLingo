import { Module } from '@nestjs/common';
import { IeltsMockAdminService } from './application/ielts-mock-admin.service.js';
import { IeltsMockLearnerService } from './application/ielts-mock-learner.service.js';
import { IeltsMockAdminController } from './ielts-mock-admin.controller.js';
import { IeltsMockLearnerController } from './ielts-mock-learner.controller.js';
@Module({ controllers: [IeltsMockAdminController, IeltsMockLearnerController], providers: [IeltsMockAdminService, IeltsMockLearnerService], exports: [IeltsMockAdminService, IeltsMockLearnerService] })
export class IeltsMockModule {}
