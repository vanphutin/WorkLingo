import type { CurriculumRevision } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { beforeAll,afterAll,it,expect,describe } from 'vitest';
import { CurriculumProgressService } from '../../src/curriculum-foundation/application/curriculum-progress.service.js';
import { createLearningSessionTestContext,registerLearner,type LearningSessionTestContext } from './learning-session-test-harness.js';
describe('R2 pinned completion API',()=>{
 let context:LearningSessionTestContext;
 beforeAll(async()=>{context=await createLearningSessionTestContext('r2_pins');},90000);
 afterAll(async()=>context?.close());
 it('completes submitted evidence, unlocks exact prerequisite and rejects target replay mismatch',async()=>{
  const email=randomUUID()+'@example.test';const agent=await registerLearner(context.app,{displayName:'R2 learner',email});const user=await context.database.user.findUniqueOrThrow({where:{email}});
  const source=await context.database.mission.findFirstOrThrow({where:{purpose:'LEARNING'},include:{lessons:{include:{lesson:{include:{versions:{where:{status:'PUBLISHED'},include:{activities:{orderBy:{order:'asc'}}}}}}}}}});const version=source.lessons[0]!.lesson.versions[0]!;
  const program=await context.database.learningProgram.create({data:{slug:'r2-'+randomUUID(),name:'R2 program',description:'D',learningGoal:'G',proficiencyLabel:'B1',iconKey:'book',availabilityStatus:'AVAILABLE',displayOrder:99,progressionPolicy:'ACTIVITY_COMPLETION'}});
  const path=await context.database.learningPath.create({data:{programId:program.id,slug:randomUUID(),name:'Path',status:'PUBLISHED'}});const level=await context.database.level.create({data:{pathId:path.id,code:randomUUID(),name:'Level',cefrReference:'B1',order:1,status:'PUBLISHED'}});
  const revisions: CurriculumRevision[]=[];
  for(let index=0;index<2;index++){
   const mission=await context.database.mission.create({data:{levelId:level.id,slug:randomUUID(),title:'Mission '+index,objective:'Read',order:index,status:'PUBLISHED',lessons:{create:{lessonId:version.lessonId,order:1}}}});
   const revision=await context.database.curriculumRevision.create({data:{missionId:mission.id,revision:1,snapshot:{category:'grammar',prerequisiteRevisionIds:index?[revisions[0]!.id]:[],objectives:[{slug:'read',statement:'Read',skills:['reading'],required:true,evidence:[{lessonVersionId:version.id,activitySlug:version.activities.find(activity=>activity.learningBlock==='readDecode')!.slug,languageBlockSlugs:[]}]}]},lessons:{create:{lessonVersionId:version.id,order:1}},...(index?{prerequisites:{create:{prerequisiteRevisionId:revisions[0]!.id}}}:{})}});revisions.push(revision);
  }
  await context.database.learningProgram.update({where:{id:program.id},data:{curriculumRevisionIds:revisions.map(r=>r.id)}});
  const enrollment=await context.database.learnerProgramEnrollment.create({data:{learnerId:user.id,programId:program.id,currentLevelId:level.id,curriculumRevisionIds:revisions.map(r=>r.id)}});await context.database.learnerProfile.update({where:{userId:user.id},data:{activeProgramId:program.id}});
  const initial=await agent.get('/api/v1/me/curriculum-roadmap').expect(200);expect(initial.body.items.map((i:{state:string})=>i.state)).toEqual(['available','locked']);
  const command={missionId:revisions[0]!.missionId,expectedCurriculumRevisionId:revisions[0]!.id,durationMinutes:45,clientSessionId:randomUUID()};
  const [one,two]=await Promise.all([agent.post('/api/v1/learning-sessions/curriculum').send(command),agent.post('/api/v1/learning-sessions/curriculum').send(command)]);expect(one.status).toBe(201);expect(two.body.id).toBe(one.body.id);
  await agent.post('/api/v1/learning-sessions/curriculum').send({...command,missionId:revisions[1]!.missionId,expectedCurriculumRevisionId:revisions[1]!.id}).expect(409);
  const activity=version.activities.find(activity=>activity.learningBlock==='readDecode')!;await context.database.learningSession.update({where:{id:one.body.id},data:{status:'COMPLETED',completedAt:new Date(),attempts:{create:{activityId:activity.id,clientAttemptId:randomUUID(),rawResponse:{},evaluationStatus:'QUEUED'}}}});
  const progress=context.app.get(CurriculumProgressService);await Promise.all([progress.projectSession(one.body.id),progress.projectSession(one.body.id)]);
  const completed=await context.database.curriculumCompletion.findMany({where:{enrollmentId:enrollment.id}});expect(completed).toHaveLength(1);expect(completed[0]!.policyVersion).toBe('curriculum-activity-completion-v1');
  const after=await agent.get('/api/v1/me/curriculum-roadmap').expect(200);expect(after.body.items.map((i:{state:string})=>i.state)).toEqual(['completed','available']);
  await context.database.curriculumRevision.update({where:{id:revisions[1]!.id},data:{status:'ARCHIVED'}});const archived=await agent.get('/api/v1/me/curriculum-roadmap').expect(200);expect(archived.body.items[1].state).toBe('locked');await agent.post('/api/v1/learning-sessions/curriculum').send({...command,missionId:revisions[1]!.missionId,expectedCurriculumRevisionId:revisions[1]!.id,clientSessionId:randomUUID()}).expect(422);
 });
});
