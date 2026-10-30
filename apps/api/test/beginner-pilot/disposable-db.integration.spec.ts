import {spawn,spawnSync,type ChildProcess} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {Test} from '@nestjs/testing';
import {ValidationPipe,type INestApplication} from '@nestjs/common';
import request from 'supertest';
import {analyzeLessonSource} from '@worklingo/content-format';
import {AppModule} from '../../src/app.module.js';
import {PrismaService} from '../../src/common/database/prisma.service.js';
import {ObjectStorage} from '../../src/storage/domain/object-storage.port.js';
import {seedFoundationCurriculum} from '../../src/curriculum/infrastructure/seed-foundation.js';
import {buildBeginnerDraftSnapshot} from '../../src/curriculum-foundation/application/foundation-validation.js';
import {denyUnscopedBeginnerMutation} from '../../src/beginner/domain/beginner-authoring-policy.js';
import {EvaluationService} from '../../src/teacher-ai/application/evaluation.service.js';
import {JobRunnerService} from '../../src/jobs/application/job-runner.service.js';
import {assertDisposableUrl,childEnvironment,ROOT} from './disposable-db.js';
if(process.env.WL_DISPOSABLE_DATABASE!=='1'||process.env.NODE_ENV!=='test'||process.env.WORKLINGO_BEGINNER_ISOLATED_TEST!=='1')throw Error('DISPOSABLE_EXPLICIT_RUN_REQUIRED');
const url=process.env.TEST_DATABASE_URL;if(!url||process.env.DATABASE_URL!==url)throw Error('DISPOSABLE_EXPLICIT_DSN_REQUIRED');assertDisposableUrl(url);
const repository=resolve(__dirname,'../../../..');
const database=new PrismaService({datasourceUrl:url});let app:INestApplication;
const bundles=JSON.parse(readFileSync(resolve(repository,'docs/qualification/beginner-pilot-post-context-requalification.json'),'utf8')).sourceBundles as {lesson:string;sourcePath:string;sourceSha256:string;reviewedBundleSha256:string}[];
let beginnerMission:string;const versions:{id:string;snapshot:ReturnType<typeof buildBeginnerDraftSnapshot> }[]=[];
describe('real disposable PostgreSQL and Nest integration; synthetic data only',()=>{
 beforeAll(async()=>{
  const identity=await database.$queryRaw<{database:string;role:string}[]>`SELECT current_database() AS database,current_user AS role`;
  expect(identity).toEqual([{database:'worklingo_r12b_evidence_closure_001',role:'wl_r12b_evidence_001'}]);
  const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(PrismaService).useValue(database).compile();app=module.createNestApplication();app.setGlobalPrefix('api/v1');app.useGlobalPipes(new ValidationPipe({forbidNonWhitelisted:true,transform:true,whitelist:true}));await app.init();await seedFoundationCurriculum(database,app.get(ObjectStorage));
  const program=await database.learningProgram.findFirstOrThrow({where:{slug:'beginner'}});
  const path=await database.learningPath.create({data:{programId:program.id,slug:'disposable-beginner',name:'Synthetic unpublished Beginner'}});
  const level=await database.level.create({data:{pathId:path.id,code:'DISPOSABLE_MG',name:'Synthetic',cefrReference:'Pre-A1',order:1}});
  beginnerMission=(await database.mission.create({data:{levelId:level.id,slug:'disposable-beginner-mission',title:'Synthetic',objective:'Isolation only',order:1}})).id;
  for(const b of bundles){const source=readFileSync(resolve(repository,b.sourcePath),'utf8');expect(createHash('sha256').update(source).digest('hex')).toBe(b.sourceSha256);const draft=analyzeLessonSource(source).normalizedDraft;if(!draft)throw Error('CANONICAL_DRAFT_REQUIRED');const snapshot=buildBeginnerDraftSnapshot(draft);
   const lesson=await database.lesson.create({data:{slug:'disposable-'+b.lesson.toLowerCase(),missions:{create:{missionId:beginnerMission,order:versions.length}}}});
   const version=await database.lessonVersion.create({data:{lessonId:lesson.id,version:1,title:snapshot.title,sourceHash:b.sourceSha256,parsedContent:JSON.parse(JSON.stringify(snapshot)),activities:{create:snapshot.activities.map(a=>({id:a.id,slug:a.slug,activityType:a.activityType,learningBlock:a.learningBlock,order:a.order,skills:a.skills,contentReferences:a.contentReferences,languageBlockReferences:a.languageBlockReferences,payload:JSON.parse(JSON.stringify(a.payload))}))}}});versions.push({id:version.id,snapshot});
  }
 });
 afterAll(async()=>{if(app)await app.close();else await database.$disconnect();});
 it('all current migrations applied successfully to the exact disposable identity',async()=>{const rows=await database.$queryRaw<{migration_name:string;finished_at:Date|null;rolled_back_at:Date|null}[]>`SELECT migration_name,finished_at,rolled_back_at FROM _prisma_migrations`;const expected=readdirSync(resolve(repository,'apps/api/prisma/migrations')).filter(n=>n!=='migration_lock.toml');expect(rows.map(r=>r.migration_name).sort()).toEqual(expected.sort());expect(rows.every(r=>r.finished_at!==null&&r.rolled_back_at===null)).toBe(true);});
 it('eight canonical Beginner draft snapshots and 64 activity payloads persist and round-trip without publication',async()=>{expect(versions).toHaveLength(8);for(const v of versions){const row=await database.lessonVersion.findUniqueOrThrow({where:{id:v.id},include:{activities:true}});expect(row.status).toBe('DRAFT');expect(row.parsedContent).toEqual(v.snapshot);expect(row.activities).toHaveLength(8);}expect(await database.activity.count({where:{lessonVersionId:{in:versions.map(v=>v.id)}}})).toBe(64);});
 it('transaction rollback and version uniqueness retain the original evidence',async()=>{const before=await database.lessonVersion.count();await expect(database.$transaction(async tx=>{await tx.lesson.create({data:{slug:'must-rollback'}});throw Error('SYNTHETIC_ROLLBACK');})).rejects.toThrow('SYNTHETIC_ROLLBACK');expect(await database.lesson.findUnique({where:{slug:'must-rollback'}})).toBeNull();const version=await database.lessonVersion.findUniqueOrThrow({where:{id:versions[0]!.id}});await expect(database.lessonVersion.create({data:{lessonId:version.lessonId,version:1,title:'Duplicate',sourceHash:'different',parsedContent:{}}})).rejects.toMatchObject({code:'P2002'});expect(await database.lessonVersion.count()).toBe(before);});
 it('unscoped Beginner publication is denied with real repository lookups and no fabricated grants',async()=>{await expect(database.$transaction(tx=>denyUnscopedBeginnerMutation(tx,{missionId:beginnerMission}))).rejects.toThrow('BEGINNER_AUTHORING_DISABLED');expect(await database.lessonVersion.count({where:{id:{in:versions.map(v=>v.id)},status:'PUBLISHED'}})).toBe(0);});
 it('authentication, enrollment, sessions, learner DTO and cached evaluation history use the real database',async()=>{
  const agent=request.agent(app.getHttpServer());await agent.post('/api/v1/auth/register').send({displayName:'Disposable synthetic learner',email:'db-evidence@example.test',password:'synthetic-local-password-only'}).expect(201);
  await agent.post('/api/v1/me/onboarding/self-placement').send({clientConfirmationId:randomUUID(),selectedLevelCode:'FOUNDATION_1'}).expect(200);
  const user=await database.user.findUniqueOrThrow({where:{email:'db-evidence@example.test'}});expect(await database.learnerProgramEnrollment.count({where:{learnerId:user.id}})).toBe(1);
  const clientSessionId=randomUUID();const created=await agent.post('/api/v1/learning-sessions').send({clientSessionId,durationMinutes:60}).expect(201);const again=await agent.post('/api/v1/learning-sessions').send({clientSessionId,durationMinutes:60}).expect(201);expect(again.body.id).toBe(created.body.id);
  await agent.post(`/api/v1/learning-sessions/${created.body.id}/start`).expect(200);const resumed=await agent.get(`/api/v1/learning-sessions/${created.body.id}`).expect(200);expect(resumed.body.plan).toEqual(created.body.plan);expect(JSON.stringify(resumed.body)).not.toMatch(/passwordHash|privateCriteria|evaluationContext/);
  const activity=await database.activity.findFirstOrThrow({where:{lessonVersionId:created.body.lessonVersionId,activityType:'writing'}});
  const attempted=await agent.post(`/api/v1/activities/${activity.id}/attempts`).send({clientAttemptId:randomUUID(),sessionId:created.body.id,response:{text:'I will follow up with the customer tomorrow.'}}).expect(201);
  expect(await app.get(JobRunnerService).runOnce()).toBe(true);const first=await database.evaluationResult.findMany({where:{attemptId:attempted.body.id}});expect(first).toHaveLength(1);expect(first[0]!.providerName).toMatch(/fake/);await app.get(EvaluationService).evaluateAttempt(attempted.body.id);expect(await database.evaluationResult.findMany({where:{attemptId:attempted.body.id}})).toEqual(first);
  expect((await database.activityAttempt.findUniqueOrThrow({where:{id:attempted.body.id}})).evaluationStatus).toBe('EVALUATED');
 });
 it('owned Web UI registers and starts a session through real Nest and PostgreSQL without API mocks',async()=>{
  const frontend=process.env.WL_DISPOSABLE_FRONTEND;if(!frontend||!resolve(frontend).startsWith(resolve(ROOT,'artifacts')+'/')&&!resolve(frontend).startsWith(resolve(ROOT,'artifacts')+'\\'))throw Error('DISPOSABLE_FRONTEND_REQUIRED');
  await app.listen(0,'127.0.0.1');const address=app.getHttpServer().address();if(!address||typeof address==='string')throw Error('DISPOSABLE_NEST_LISTENER');
  const req=createRequire(resolve(repository,'apps/web/package.json'));const {chromium}=req('@playwright/test');const browser=await chromium.launch({headless:true,env:childEnvironment()});
  let web:ChildProcess|undefined;let output='';let journeyComplete=false;
  try{
   const boot=resolve(frontend,'no-env-preload.cjs');writeFileSync(boot,`const fs=require('fs');const read=fs.readFileSync;fs.readFileSync=function(p,...a){const n=String(p).split(String.fromCharCode(92)).join('/').split('/').pop();if(n==='.env'||n.startsWith('.env.'))throw Error('DISPOSABLE_WEB_ENV_DENIED');return Reflect.apply(read,fs,[p,...a]);};process.loadEnvFile=()=>{throw Error('DISPOSABLE_WEB_ENV_DENIED');};`);
   const webEnv={...childEnvironment(),NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',WORKLINGO_API_URL:'http://127.0.0.1:'+address.port};
   web=spawn(process.execPath,['--require',boot,req.resolve('next/dist/bin/next'),'dev','--webpack','-H','127.0.0.1','-p','0'],{cwd:resolve(frontend,'apps/web'),env:webEnv,stdio:['ignore','pipe','pipe'],windowsHide:true});web.stdout?.on('data',b=>{output+=String(b);});web.stderr?.on('data',b=>{output+=String(b);});
   let webUrl='';for(let i=0;i<180;i++){const match=output.match(/http:\/\/127\.0\.0\.1:(\d+)/);if(match&&/Ready in/.test(output)){webUrl=match[0];break;}if(web.exitCode!==null)throw Error('DISPOSABLE_NEXT_START_FAILED');await new Promise(r=>setTimeout(r,500));}if(!webUrl)throw Error('DISPOSABLE_NEXT_START_TIMEOUT');
   const context=await browser.newContext();context.setDefaultTimeout(120000);context.setDefaultNavigationTimeout(120000);await context.addCookies([{name:'worklingo_locale',value:'en',url:webUrl}]);await context.route('**/*',(route: {request():{url():string};continue():Promise<void>;abort():Promise<void>})=>{const u=new URL(route.request().url());return ['127.0.0.1','localhost'].includes(u.hostname)?route.continue():route.abort();});const page=await context.newPage();
   await page.goto(webUrl+'/register');await page.getByLabel('Display name').fill('Web DB synthetic learner');await page.getByLabel('Email').fill('web-db-evidence@example.test');await page.getByLabel('Password',{exact:true}).fill('Synthetic-Web-Local-Password-Only123!');await page.getByRole('button',{name:'Create account'}).click();await page.waitForURL(/\/onboarding/,{timeout:60000});
   const onboarding=await page.evaluate(async(id:string)=>{const r=await fetch('/api/v1/me/onboarding/self-placement',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({clientConfirmationId:id,selectedLevelCode:'FOUNDATION_1'})});return r.status;},randomUUID());expect(onboarding).toBe(200);await page.goto(webUrl+'/dashboard');await page.getByRole('button',{name:/start 60-minute session/i}).click();await page.waitForURL(/\/sessions\//,{timeout:60000});
   const learner=await database.user.findUniqueOrThrow({where:{email:'web-db-evidence@example.test'}});expect(await database.learnerProgramEnrollment.count({where:{learnerId:learner.id}})).toBe(1);const persisted=await database.learningSession.findFirstOrThrow({where:{learnerId:learner.id}});expect(new URL(page.url()).pathname).toContain(persisted.id);await page.reload();await page.getByRole('button',{name:'Pause session'}).waitFor();expect(await database.learningSession.count({where:{learnerId:learner.id}})).toBe(1);await context.close();journeyComplete=true;
  }finally{await browser.close();if(web&&web.exitCode===null){const exited=new Promise<void>(r=>web!.once('exit',()=>r()));web.kill();await Promise.race([exited,new Promise(r=>setTimeout(r,5000))]);}writeFileSync(resolve(ROOT,'artifacts','web-db-result.txt'),output);const build=spawnSync(process.execPath,['--require',resolve(frontend,'no-env-preload.cjs'),req.resolve('next/dist/bin/next'),'build','--webpack'],{cwd:resolve(frontend,'apps/web'),env:{...childEnvironment(),NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',WORKLINGO_API_URL:'http://127.0.0.1:'+address.port},encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024});writeFileSync(resolve(ROOT,'artifacts','web-production-build.txt'),build.stdout+'\\n'+build.stderr);if(journeyComplete)expect(build.status,'fresh snapshot production Next build').toBe(0);await app.getHttpServer().close();}
 },420000);
 it('env-file loading and external provider requests are denied',async()=>{expect(()=>process.loadEnvFile(resolve(ROOT,'disposable-db','.env'))).toThrow('DISPOSABLE_ENV_READ_DENIED');await expect(async()=>fetch('https://example.test')).rejects.toThrow('DISPOSABLE_PROVIDER_DENIED');});
});
