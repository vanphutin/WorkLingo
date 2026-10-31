import { ProgramProgressService } from '../../learning-programs/application/program-progress.service.js';
import { describe,it,expect,vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { LearningSessionsService } from './learning-sessions.service.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { CurriculumService } from '../../curriculum/application/curriculum.service.js';
import { MasteryService } from '../../mastery/application/mastery.service.js';
import { SessionCreationService } from './session-creation.service.js';
import { ProgramContextService } from '../../learning-programs/application/program-context.service.js';
import { CurriculumEligibilityService } from '../../curriculum-foundation/application/curriculum-eligibility.service.js';
import { CurriculumProgressService } from '../../curriculum-foundation/application/curriculum-progress.service.js';
const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function setup(available=true){
 const create=vi.fn(async()=>({id:id(8)}));const tx={$queryRaw:vi.fn(),learnerProfile:{findUnique:async()=>({onboardingStatus:'COMPLETE'})},learningSession:{findUnique:async()=>null},learnerProgramEnrollment:{findUnique:async()=>({curriculumRevisionIds:[id(2)]})},learningProgram:{findUnique:async()=>({availabilityStatus:'AVAILABLE',progressionPolicy:'ACTIVITY_COMPLETION'})}};
 const db={...tx,$transaction:async(fn:(t:unknown)=>unknown)=>fn(tx)};
 const module=await Test.createTestingModule({providers:[{provide:ProgramProgressService,useValue:{forEnrollment:async()=>null,projectSession:async()=>false,assertSessionMutation:async()=>{},planningOptions:async()=>({})}},LearningSessionsService,{provide:PrismaService,useValue:db},{provide:CurriculumService,useValue:{getPublishedMissionForRevision:async()=>({id:id(1),purpose:'learning',lessonVersion:{id:id(3)}})}},{provide:MasteryService,useValue:{getReviewQueue:async()=>[]}},{provide:SessionCreationService,useValue:{create}},{provide:ProgramContextService,useValue:{resolve:async()=>({programId:id(4),enrollmentId:id(5)})}},{provide:CurriculumEligibilityService,useValue:{resolve:async()=>({available,revisionId:id(2),reasons:available?[]:['prerequisite_incomplete']})}},{provide:CurriculumProgressService,useValue:{}}]}).compile();return {service:module.get(LearningSessionsService),module,create};
}
describe('targeted curriculum start',()=>{
 it('rejects a stale revision with conflict without creating a session',async()=>{const h=await setup();await expect(h.service.createCurriculumSession(id(9),{missionId:id(1),expectedCurriculumRevisionId:id(7),durationMinutes:45,clientSessionId:id(6)})).rejects.toMatchObject({status:409,response:{code:'CURRICULUM_REVISION_CONFLICT'}});expect(h.create).not.toHaveBeenCalled();await h.module.close();});
 it('creates the exact enrolled revision',async()=>{const h=await setup();expect(await h.service.createCurriculumSession(id(9),{missionId:id(1),expectedCurriculumRevisionId:id(2),durationMinutes:45,clientSessionId:id(6)})).toEqual({id:id(8)});await h.module.close();});
 it('rejects locked curriculum without creating a session',async()=>{const h=await setup(false);await expect(h.service.createCurriculumSession(id(9),{missionId:id(1),expectedCurriculumRevisionId:id(2),durationMinutes:45,clientSessionId:id(6)})).rejects.toThrow();expect(h.create).not.toHaveBeenCalled();await h.module.close();});
});
