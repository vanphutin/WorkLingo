import {describe,it,expect,vi} from 'vitest';
import type {PrismaService} from '../../common/database/prisma.service.js';
import {FoundationCurriculumService} from './foundation-curriculum.service.js';
import {fixtureTarget,fixtureActor} from '../../../test/fixtures/beginner/authoring/fixture-factory.js';
describe('generic Foundation commands stay closed for Beginner',()=>{
 it('denies generic draft writes even with a valid legacy definition',async()=>{
  const definition={category:'grammar' as const,prerequisiteRevisionIds:[],objectives:[{slug:'greet',statement:'Introduce a person',skills:['reading' as const],required:true,evidence:[{lessonVersionId:fixtureTarget.programId,activitySlug:'read',languageBlockSlugs:[]}]}]};
  let draft:object|null=null;const mission={id:fixtureTarget.missionId,levelId:fixtureTarget.levelId,status:'DRAFT',level:{pathId:fixtureTarget.pathId,status:'DRAFT',path:{programId:fixtureTarget.programId,status:'DRAFT',program:{slug:'beginner'}}}};
  const tx={$queryRaw:vi.fn(),$executeRaw:vi.fn(),mission:{findUnique:vi.fn().mockResolvedValue(mission),findUniqueOrThrow:vi.fn().mockResolvedValue(mission)},mutationReceipt:{findUnique:vi.fn().mockResolvedValue(null),create:vi.fn()},auditLog:{create:vi.fn()},curriculumRevision:{findMany:vi.fn().mockResolvedValue([])},curriculumDefinition:{findUnique:vi.fn(async()=>draft),create:vi.fn(async({data})=>{draft={...data,revision:1,status:'DRAFT'};})}};
  const db={...tx,$transaction:async(fn:(tx:unknown)=>unknown)=>fn(tx)};
  await expect(new FoundationCurriculumService(db as unknown as PrismaService).saveDraft(fixtureTarget.missionId,fixtureActor.id,{expectedRevision:null,idempotencyKey:fixtureTarget.pathId,definition})).rejects.toMatchObject({response:{code:'BEGINNER_AUTHORING_DISABLED'}});
  expect(tx.curriculumDefinition.create).not.toHaveBeenCalled();
 });
});
