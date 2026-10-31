import { ProgramProgressService } from '../../learning-programs/application/program-progress.service.js';
import { Test } from '@nestjs/testing';
import { describe,it,expect } from 'vitest';
import { CurriculumEligibilityService } from './curriculum-eligibility.service.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { ProgramContextService } from '../../learning-programs/application/program-context.service.js';
describe('R2 enrollment eligibility pins',()=>{
 it('selects the old enrollment revision instead of newer published revision',async()=>{
 const context={programId:'program',enrollmentId:'enrollment'};const old={id:'old',status:'PUBLISHED',lessons:[{lessonVersion:{status:'PUBLISHED'}}],prerequisites:[]};
 const db={learnerProgramEnrollment:{findUnique:async()=>({curriculumRevisionIds:['old']})},mission:{findUnique:async()=>({status:'PUBLISHED',level:{status:'PUBLISHED',path:{programId:'program',status:'PUBLISHED'}},curriculumDefinition:{id:'draft'},curriculumRevisions:[{...old,id:'new'},old]})}};
 const module=await Test.createTestingModule({providers:[{provide:ProgramProgressService,useValue:{forEnrollment:async()=>null,projectSession:async()=>false,assertSessionMutation:async()=>{},planningOptions:async()=>({})}},CurriculumEligibilityService,{provide:PrismaService,useValue:db},{provide:ProgramContextService,useValue:{resolve:async()=>context}}]}).compile();
 expect(await module.get(CurriculumEligibilityService).resolve('learner','mission',db as never)).toEqual({revisionId:'old',available:true,reasons:[]});await module.close();
 });
});
