import {it,expect,beforeAll,afterAll} from 'vitest';
import {openBeginnerHarness} from './beginner-test-harness.js';
import {verifyHistoricalHashes} from '../beginner-main/fixtures.js';
let h:Awaited<ReturnType<typeof openBeginnerHarness>>;
beforeAll(async()=>{h=await openBeginnerHarness();});afterAll(async()=>{await h?.close();});
it('exports only owner-selected actual published fixture identities; never self-approves',async()=>{
 const result=await h.registry.exportTestCandidate(h.editor,h.fixture.manifest);
 expect(result.state).toBe('TEST_PUBLISHED');expect(result.approvalRef).toBeNull();
 expect(result.fixtureOnly).toBe(true);expect(result.contentReadiness).toBe('FIXTURE_ONLY');
 for(const version of result.snapshots){const row=await h.db.lessonVersion.findUniqueOrThrow({where:{id:version.lessonVersionId}});expect(row.sourceHash).toBe(version.sourceHash);expect(row.status).toBe('PUBLISHED');}
 await expect(h.registry.approveTestRelease(h.editor,result.releaseId,'unit-test-only-not-a-human-approval')).rejects.toThrow();
});
it('retains an actual historical V1 snapshot for the owner-provisioned pinned session',async()=>{
 const {historicalSessionId,learnerId,historicalVersionId}=h.fixture;
 if(!historicalSessionId||!learnerId||!historicalVersionId)throw Error('BLOCKED: exact historical session fixture required');
 const session=await h.db.learningSession.findUniqueOrThrow({where:{id:historicalSessionId},include:{lessonVersion:true,curriculumRevision:true}});
 expect(session.learnerId).toBe(learnerId);expect(session.lessonVersionId).toBe(historicalVersionId);expect(session.lessonVersion.status).toBe('PUBLISHED');expect(session.curriculumRevision?.status).toBe('PUBLISHED');
 const exact=await h.db.lessonVersion.findUniqueOrThrow({where:{id:historicalVersionId}});expect(exact.parsedContent).toEqual(session.lessonVersion.parsedContent);
 if(h.permission.schemaVersion===2){
  if(!h.fixture.historicalHashes||!session.curriculumRevision)throw Error('BLOCKED: pre-successor historical hashes required');
  verifyHistoricalHashes(h.fixture.historicalHashes,{version:exact,curriculum:session.curriculumRevision,snapshot:session.planSnapshot});
  expect((await h.db.lesson.findUniqueOrThrow({where:{id:h.fixture.historicalLessonId!}})).currentPublishedVersionId).toBe(h.fixture.currentVersionId);expect(h.fixture.currentVersionId).not.toBe(historicalVersionId);expect(session.curriculumRevisionId).toBe(h.fixture.historicalCurriculumId);expect(await h.db.curriculumRevision.count({where:{missionId:session.missionId,status:'PUBLISHED'}})).toBe(2);
 }
});
