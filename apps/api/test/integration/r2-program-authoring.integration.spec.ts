import {randomUUID} from 'node:crypto';
import request from 'supertest';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {createLearningSessionTestContext,registerLearner,type LearningSessionTestContext} from './learning-session-test-harness.js';
import {seedContentAdmin} from '../../src/users/infrastructure/seed-content-admin.js';
import {lessonSnapshotSchema} from '../../src/curriculum/domain/curriculum.types.js';
describe('R2 program authoring HTTP',()=>{
 let context:LearningSessionTestContext,admin:ReturnType<typeof request.agent>,learner:ReturnType<typeof request.agent>;
 const metadata={slug:'r2-http-program',name:'R2 workplace',description:'Synthetic program',learningGoal:'Practice English',proficiencyLabel:'Foundation',iconKey:'intermediate',displayOrder:51,idempotencyKey:randomUUID()};
 beforeAll(async()=>{if(!process.env.TEST_DATABASE_URL?.includes(':55447/'))throw Error('DISPOSABLE_R2_DATABASE_REQUIRED');context=await createLearningSessionTestContext('r2_authoring');admin=request.agent(context.app.getHttpServer());const email='r2-admin@example.test';await seedContentAdmin(context.database,{displayName:'Synthetic admin',email,password:'Synthetic-Only-123!'});await admin.post('/api/v1/auth/login').send({email,password:'Synthetic-Only-123!'}).expect(200);learner=await registerLearner(context.app,{displayName:'Synthetic learner',email:'r2-learner@example.test'});},60000);
 afterAll(async()=>{await context?.close();});
 it('waits for a concurrent mission archive before validating publication',async()=>{
  const {idempotencyKey:_,...programMetadata}=metadata;
  const program=await context.database.learningProgram.create({data:{...programMetadata,slug:'r2-race',progressionPolicy:'ACTIVITY_COMPLETION'}});
  const path=await context.database.learningPath.create({data:{programId:program.id,name:'Race',slug:randomUUID(),status:'PUBLISHED'}});
  const level=await context.database.level.create({data:{pathId:path.id,name:'Race',code:randomUUID(),cefrReference:'A1',order:1,status:'PUBLISHED'}});
  const mission=await context.database.mission.create({data:{levelId:level.id,slug:randomUUID(),title:'Race',objective:'Race',order:1,status:'PUBLISHED'}});
  const version=await context.database.lessonVersion.findFirstOrThrow({where:{status:'PUBLISHED'}});
  const activity=lessonSnapshotSchema.parse(version.parsedContent).activities.find(row=>row.skills.length)!;
  await context.database.missionLesson.create({data:{missionId:mission.id,lessonId:version.lessonId,order:1}});
  const revision=await context.database.curriculumRevision.create({data:{missionId:mission.id,revision:1,snapshot:{category:'writing',prerequisiteRevisionIds:[],objectives:[{slug:'race',statement:'Race evidence',required:true,skills:[activity.skills[0]],evidence:[{lessonVersionId:version.id,activitySlug:activity.slug,languageBlockSlugs:[]}]}]},lessons:{create:{lessonVersionId:version.id,order:1}}}});
  let release!:()=>void,ready!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  const locked=new Promise<void>(resolve=>{ready=resolve;});
  const archive=context.database.$transaction(async tx=>{await tx.mission.update({where:{id:mission.id},data:{status:'ARCHIVED'}});ready();await gate;},{timeout:15000});
  await locked;
  let settled=false;
  const publish=admin.post(`/api/v1/admin/learning-programs/${program.id}/publish`).send({curriculumRevisionIds:[revision.id],expectedRevision:1,idempotencyKey:randomUUID()}).then(response=>{settled=true;return response;});
  try {
   let waiting=false;
   for(let i=0;i<50&&!settled;i++){
    const rows=await context.database.$queryRaw<{waiting:boolean}[]>`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE 'LOCK TABLE %CurriculumPrerequisite%') AS waiting`;
    if(rows[0]?.waiting){waiting=true;break;}
    await new Promise(resolve=>setTimeout(resolve,20));
   }
   expect(waiting).toBe(true);
  } finally {release();await archive;}
  expect((await publish).status).toBe(422);
  expect((await context.database.learningProgram.findUniqueOrThrow({where:{id:program.id}})).curriculumRevisionIds).toEqual([]);
 });
 it('denies learner mutation and reserved program creation',async()=>{await learner.post('/api/v1/admin/learning-programs').send(metadata).expect(403);await admin.post('/api/v1/admin/learning-programs').send({...metadata,slug:'beginner'}).expect(400);});
 it('serializes create replay, rejects changed payload and preserves draft policy',async()=>{const [a,b]=await Promise.all([admin.post('/api/v1/admin/learning-programs').send(metadata),admin.post('/api/v1/admin/learning-programs').send(metadata)]);expect(a.status).toBe(201);expect(b.status).toBe(201);expect(a.body.id).toBe(b.body.id);expect(a.body).toMatchObject({availabilityStatus:'IN_DEVELOPMENT',progressionPolicy:'ACTIVITY_COMPLETION',revision:1,curriculumRevisionIds:[]});expect(a.body.createdAt).toBeUndefined();await admin.post('/api/v1/admin/learning-programs').send({...metadata,name:'Changed'}).expect(409);});
 it('locks optimistic updates and rejects foreign publication, unavailable enrollment and unknown fields',async()=>{const created=await admin.post('/api/v1/admin/learning-programs').send(metadata).expect(201);const {slug:_,idempotencyKey:__,...fields}=metadata;const input={...fields,name:'Updated',expectedRevision:1,idempotencyKey:randomUUID()};const update=await admin.put('/api/v1/admin/learning-programs/'+created.body.id).send(input).expect(200);expect(update.body.revision).toBe(2);await admin.put('/api/v1/admin/learning-programs/'+created.body.id).send({...input,idempotencyKey:randomUUID()}).expect(409);await admin.post('/api/v1/admin/learning-programs/'+created.body.id+'/publish').send({curriculumRevisionIds:[randomUUID()],expectedRevision:2,idempotencyKey:randomUUID()}).expect(422);await learner.post('/api/v1/me/program-enrollments').send({programSlug:metadata.slug,expectedRevision:1}).expect(422);await admin.post('/api/v1/admin/learning-programs').send({...metadata,slug:'another',idempotencyKey:randomUUID(),progressionPolicy:'MASTERY'}).expect(400);const list=await admin.get('/api/v1/admin/learning-programs').expect(200);expect(list.body.programs.find((p:{id:string})=>p.id===created.body.id).name).toBe('Updated');});
});
