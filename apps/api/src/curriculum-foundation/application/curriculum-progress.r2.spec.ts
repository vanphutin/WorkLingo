import { ProgramProgressService } from '../../learning-programs/application/program-progress.service.js';
import { describe, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import { CurriculumProgressService } from './curriculum-progress.service.js';
import { CurriculumEligibilityService } from './curriculum-eligibility.service.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { ProgramContextService } from '../../learning-programs/application/program-context.service.js';
const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function fixture(kind='QUEUED', mutation='') {
 const revision={id:id(2),missionId:id(3),snapshot:{category:'grammar',prerequisiteRevisionIds:[],objectives:[{slug:'read',statement:'Read',skills:['reading'],required:true,evidence:[{lessonVersionId:id(4),activitySlug:'read',languageBlockSlugs:['greeting']}]}]},lessons:[{lessonVersionId:id(4)}]};
 const session={id:id(1),learnerId:id(5),missionId:id(3),curriculumRevisionId:id(2),status:'COMPLETED',lessonVersionId:id(4),planSnapshot:{lessonVersionId:id(4),blocks:[{activityIds:[id(6)]}]},mission:{purpose:'LEARNING'},attempts:[{id:id(7),learnerId:id(5),activityId:id(6),sessionId:id(1),evaluationStatus:kind,score:null,activity:{slug:'read',lessonVersionId:id(4)}}]};
 if(mutation==='outside-plan')session.planSnapshot.blocks[0]!.activityIds=[];
 if(mutation==='foreign')session.attempts[0]!.learnerId=id(99);
 if(mutation==='placement')session.mission.purpose='PLACEMENT';
 if(mutation==='incomplete')session.status='IN_PROGRESS';
 let receipt:unknown=null;
 const db={curriculumRevision:{findUniqueOrThrow:async()=>revision},learningSession:{findMany:async()=>[session]},learningProgram:{findUnique:async()=>({progressionPolicy:'ACTIVITY_COMPLETION'})},masteryRecord:{findMany:async()=>[]},$transaction:async(fn:(t:unknown)=>unknown)=>fn(db)};
 const module=await Test.createTestingModule({providers:[{provide:ProgramProgressService,useValue:{forEnrollment:async()=>null,projectSession:async()=>false,assertSessionMutation:async()=>{},planningOptions:async()=>({})}},CurriculumProgressService,{provide:PrismaService,useValue:db},{provide:ProgramContextService,useValue:{}},{provide:CurriculumEligibilityService,useValue:{}}]}).compile();
 const service=module.get(CurriculumProgressService);
 const tx={...db,learningSession:{...db.learningSession,findUnique:async()=>({...session,curriculumRevision:{...revision,mission:{level:{path:{programId:id(8)}}}}})},learnerProgramEnrollment:{findUnique:async()=>({id:id(9),curriculumRevisionIds:[id(2)]})},curriculumCompletion:{upsert:async(input:unknown)=>{receipt=input;}}};
 await service.projectSession(id(1),tx as never);await module.close();return receipt;
}
describe('R2 activity completion',()=>{
 it.each(['SUBMITTED','QUEUED','PROCESSING','EVALUATION_FAILED','EVALUATED'])('completes persisted %s evidence without promoting mastery',async status=>{expect(await fixture(status)).toMatchObject({create:{policyVersion:'curriculum-activity-completion-v1'}});});
 it.each(['outside-plan','foreign','placement','incomplete'])('rejects %s evidence',async mutation=>{expect(await fixture('QUEUED',mutation)).toBeNull();});
});

describe('roadmap targeted start capability', () => {
 it.each([
  ['ACTIVITY_COMPLETION', [id(2)], true],
  ['ACTIVITY_COMPLETION', [], false],
  ['MASTERY', [id(2)], false],
  ['MASTERY', [], false],
 ] as const)('requires completion policy and enrollment pins: %s %j', async (progressionPolicy, pins, expected) => {
  const db = {
   learnerProgramEnrollment: { findUniqueOrThrow: async () => ({ curriculumRevisionIds: pins }) },
   curriculumRevision: { findMany: async () => [] },
   learningProgram: { findUnique: async () => ({ progressionPolicy }) },
   $transaction: async (fn: (tx: unknown) => unknown) => fn(db),
  };
  const module = await Test.createTestingModule({ providers: [{provide:ProgramProgressService,useValue:{forEnrollment:async()=>null,projectSession:async()=>false,assertSessionMutation:async()=>{},planningOptions:async()=>({})}},CurriculumProgressService,
   { provide: PrismaService, useValue: db },
   { provide: ProgramContextService, useValue: { resolve: async () => ({ programId: id(8), enrollmentId: id(9) }) } },
   { provide: CurriculumEligibilityService, useValue: {} },
  ] }).compile();
  try {
   expect(await module.get(CurriculumProgressService).getRoadmap(id(5))).toHaveProperty('targetedStartSupported', expected);
  } finally { await module.close(); }
 });
});
