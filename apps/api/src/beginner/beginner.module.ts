import {BeginnerReleaseService} from './application/beginner-release.service.js';
import {PrismaService} from '../common/database/prisma.service.js';
import {ObjectStorage} from '../storage/domain/object-storage.port.js';
import {Module} from '@nestjs/common';
import {DatabaseModule} from '../common/database/database.module.js';
import {ContentAuthoringModule} from '../content-authoring/content-authoring.module.js';
import {CurriculumFoundationModule} from '../curriculum-foundation/curriculum-foundation.module.js';
import {AdminCurriculumModule} from '../admin-curriculum/admin-curriculum.module.js';
import {StorageModule} from '../storage/storage.module.js';
import {BeginnerAdminController} from './beginner-admin.controller.js';
import {BeginnerAuthoringService} from './application/beginner-authoring.service.js';
import {BeginnerAuthoringPolicy,verifyBeginnerTarget} from './domain/beginner-authoring-policy.js';
import {readApprovedBeginnerPermission,verifyBeginnerDatabaseIdentity} from './domain/beginner-environment-preflight.js';
@Module({
 imports:[DatabaseModule,ContentAuthoringModule,CurriculumFoundationModule,AdminCurriculumModule,StorageModule],
 controllers:[BeginnerAdminController],
 providers:[BeginnerAuthoringService,{provide:BeginnerReleaseService,inject:[PrismaService,BeginnerAuthoringPolicy,ObjectStorage],useFactory:(db:PrismaService,policy:BeginnerAuthoringPolicy,storage:ObjectStorage)=>new BeginnerReleaseService(db,policy,storage)},{provide:BeginnerAuthoringPolicy,useFactory:()=>new BeginnerAuthoringPolicy({readPermission:readApprovedBeginnerPermission,verifyTarget:verifyBeginnerTarget,verifyEnvironment:verifyBeginnerDatabaseIdentity})}],
 exports:[BeginnerAuthoringService,BeginnerReleaseService],
})
export class BeginnerModule{}
