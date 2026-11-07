import {tmpdir} from 'node:os';
import {expect,test} from '@playwright/test';
import {createRequire} from 'node:module';
import {readFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {expectNoHorizontalOverflow} from './helpers/learner-onboarding';
const requireApi=createRequire(path.resolve(__dirname,'../../api/package.json'));
const {PrismaClient}=requireApi('@prisma/client');
const evidence=process.env.WL_R21_BROWSER_EVIDENCE_DIR??path.join(tmpdir(),'worklingo-r21-20261107','browser');
const url=process.env.WL_R21_TEST_DATABASE_URL??readFileSync(path.join(evidence,'../test-database-url.txt'),'utf8').trim();
const target=new URL(url);
if(`${target.hostname}:${target.port}${target.pathname}`!=='127.0.0.1:55450/worklingo_r21'||(target.searchParams.get('schema')??'public')!=='public')throw new Error('OWNED_R21_CLONE_REQUIRED');

test('published Beginner: actual catalog, eight lessons,64 activities,24audio and persisted completion',async({page,context},info)=>{
 mkdirSync(evidence,{recursive:true});
 page.on('console',msg=>{if(msg.type()==='error')console.log('CONSOLE',msg.text());});
 page.on('pageerror',error=>console.log('BROWSER_ERROR',error.message));
 page.on('requestfailed',req=>{if(req.failure()?.errorText!=='net::ERR_ABORTED')console.log('REQUEST_FAILED',new URL(req.url()).pathname,req.failure()?.errorText);});
 const external:string[]=[];
 await context.route(u=>!['127.0.0.1','localhost'].includes(u.hostname),async route=>{const u=new URL(route.request().url());if(!['127.0.0.1','localhost'].includes(u.hostname)&&['http:','https:'].includes(u.protocol)){external.push(u.origin);await route.abort();}else await route.continue();});
 const db=new PrismaClient({datasourceUrl:url});
 try{
  const release=await db.programVersion.findFirstOrThrow({where:{program:{slug:'beginner'},status:'PUBLISHED',source:'AUTHORED'},orderBy:{version:'desc'}});
  const snapshot=release.snapshot as {curriculumBindings:Array<{missionId:string;curriculumRevisionId:string;lessons:Array<{lessonVersionId:string;title:string;activityIds:string[]}>}>};
  const lessons=snapshot.curriculumBindings.flatMap(binding=>binding.lessons.map(lesson=>({binding,lesson})));
  expect(lessons).toHaveLength(8);
  expect((await page.request.post('/api/v1/auth/register',{data:{displayName:'R21 browser learner',email:`r21-browser-${randomUUID()}@example.test`,password:'R21-synthetic-password-123!'}})).status()).toBe(201);
  const state=await(await page.request.get('/api/v1/me/onboarding')).json();
  expect(state,JSON.stringify(state)).toHaveProperty('eligibleLevels');
  const level=state.eligibleLevels.find((l:{available:boolean})=>l.available);expect(level).toBeTruthy();
  expect((await page.request.post('/api/v1/me/onboarding/self-placement',{data:{clientConfirmationId:randomUUID(),selectedLevelCode:level.code}})).status()).toBe(200);
  const user=await(await page.request.get('/api/v1/me')).json();
  expect((await page.request.patch('/api/v1/me/preferences',{headers:{'x-worklingo-account-id':user.id},data:{locale:'en'}})).ok()).toBe(true);
  await page.goto('/programs');
  const card=page.locator('.program-card-beginner');
  await expect(card.getByText('Beta',{exact:true})).toBeVisible({timeout:60000});
  const details=card.locator('summary');await details.focus();await expect(details).toBeFocused();await page.keyboard.press('Enter');await expect(card.locator('details')).toHaveAttribute('open','');
  await expect(card.getByText('64',{exact:true})).toBeVisible();await expect(card.getByText('8',{exact:true})).toBeVisible();
  await expect(card.getByText(/Speaking and writing are saved as unscored practice/)).toBeVisible();
  for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await expectNoHorizontalOverflow(page);await page.screenshot({path:path.join(evidence,`${info.project.name}-catalog-${theme}.png`),fullPage:true});}
  await card.getByRole('button',{name:/Open .* program/}).click();await expect(page).toHaveURL(/\/dashboard$/);
  const enrolled=await(await page.request.get('/api/v1/me/program-context')).json();
  const enrollmentId=enrolled.enrollment.id;expect(enrolled.activeProgram.slug).toBe('beginner');
  let audioCount=0,attemptCount=0;const start=Date.now();
  for(const [index,{lesson}]of lessons.entries()){
   await page.goto('/programs');await page.getByRole('button',{name:'Program progress',exact:true}).click();
   const progress=await(await page.request.get(`/api/v1/me/program-enrollments/${enrollmentId}/progress`)).json();
   const item=progress.items.find((i:{lessonVersionId:string})=>i.lessonVersionId===lesson.lessonVersionId);expect(item.eligible).toBe(true);
   const recommendation=page.getByRole('heading',{name:'Recommended next action',exact:true}).locator('..');
   await recommendation.getByRole('button',{name:'Start lesson',exact:true}).click();await expect(page).toHaveURL(/\/sessions\/[\da-f-]+$/);
   const sessionId=page.url().split('/').at(-1)!;
   const stored=await db.lessonVersion.findUniqueOrThrow({where:{id:lesson.lessonVersionId}});const content=stored.parsedContent as {activities:Array<{id:string;activityType:string;payload:{questions?:Array<{answerIndex:number;options:string[]}>}}>};
   for(const [checkpoint,activityId]of lesson.activityIds.entries()){
    const activity=content.activities.find(a=>a.id===activityId)!;
    await expect(page.locator('.activity-prompt')).toBeVisible();
    if(index===0&&checkpoint===0){await page.getByRole('button',{name:'Pause session',exact:true}).click();await page.getByRole('button',{name:'Resume session',exact:true}).click();await expect(page.getByRole('button',{name:'Pause session',exact:true})).toBeVisible();}
    if(activity.activityType==='reading'||activity.activityType==='listening'){
     for(const q of activity.payload.questions??[])await page.getByLabel(q.options[q.answerIndex]!,{exact:true}).check();
    }else{await page.getByRole('textbox').fill('Hello. My name is Linh. I work with my team.');await expect(page.getByText(/Unscored practice:/)).toBeVisible();expect(await page.getByRole('button',{name:'Record response',exact:true}).count()).toBe(0);}
    if(activity.activityType==='listening'){
     const response=await page.request.get(`/api/v1/learning-sessions/${sessionId}/activities/${activityId}/audio`);expect(response.status()).toBe(200);const bytes=await response.body();expect(bytes.subarray(0,4).toString()).toBe('RIFF');expect(bytes.length).toBeGreaterThan(44);audioCount++;
     const audio=page.locator('audio').first();await expect(audio).toHaveAttribute('src',/audio/);await audio.evaluate((el:HTMLAudioElement)=>el.load());await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>el.readyState)).toBeGreaterThanOrEqual(1);
    }
    if(index===0&&checkpoint===1){await page.reload();await expect(page.locator('.activity-prompt')).toBeVisible();for(const q of activity.payload.questions??[])await page.getByLabel(q.options[q.answerIndex]!,{exact:true}).check();}
    const attemptResponse=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith(`/activities/${activityId}/attempts`));
    await page.getByRole('button',{name:'Continue',exact:true}).click();const submitted=await attemptResponse;expect(submitted.status()).toBe(201);attemptCount++;
    const saved=await submitted.json();if(['speaking','writing'].includes(activity.activityType)){expect(saved.score).toBeNull();expect(saved.evaluationStatus).toBe('submitted');}
    await expect.poll(async()=> (await(await page.request.get(`/api/v1/learning-sessions/${sessionId}`)).json()).currentCheckpoint).toBe(checkpoint+1);
    if(checkpoint<7)await page.waitForTimeout(150);
    if(attemptCount===48&&Date.now()-start<61000)await page.waitForTimeout(61000-(Date.now()-start));
   }
   await expect(page.getByRole('heading',{name:'Session Completed!',exact:true})).toBeVisible();
   if(index===0)await page.screenshot({path:path.join(evidence,`${info.project.name}-session.png`),fullPage:true});
  }
  expect(attemptCount).toBe(64);expect(audioCount).toBe(24);
  await page.goto('/programs');await page.getByRole('button',{name:'Program progress',exact:true}).click();
  const progress=await(await page.request.get(`/api/v1/me/program-enrollments/${enrollmentId}/progress`)).json();expect(progress.completionPercentage).toBe(100);expect(progress.items.filter((i:{completed:boolean})=>i.completed)).toHaveLength(8);
  await expect(page.getByRole('heading',{name:'Reviews',exact:true})).toBeVisible();await expectNoHorizontalOverflow(page);await page.screenshot({path:path.join(evidence,`${info.project.name}-complete.png`),fullPage:true});
  await page.getByRole('combobox',{name:'Interface language',exact:true}).selectOption('vi');await page.reload();await expect(page.getByRole('heading',{name:'Chọn chương trình học'})).toBeVisible();await expectNoHorizontalOverflow(page);await page.screenshot({path:path.join(evidence,`${info.project.name}-vi.png`),fullPage:true});
  expect(external).toEqual([]);expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await info.attach('journey-counts',{body:JSON.stringify({releaseId:release.id,enrollmentId,attemptCount,audioCount,viewport:page.viewportSize(),external}),contentType:'application/json'});
 }finally{await db.$disconnect();}
});

test('keyboard focus, pause/resume and localized unscored practice remain usable',async({page,context},info)=>{
 const email=`r21-focus-${randomUUID()}@example.test`;
 expect((await page.request.post('/api/v1/auth/register',{data:{displayName:'R21 focus learner',email,password:'R21-synthetic-password-123!'}})).status()).toBe(201);
 const state=await(await page.request.get('/api/v1/me/onboarding')).json();
 expect((await page.request.post('/api/v1/me/onboarding/self-placement',{data:{clientConfirmationId:randomUUID(),selectedLevelCode:state.eligibleLevels.find((l:{available:boolean})=>l.available).code}})).ok()).toBe(true);
 const user=await(await page.request.get('/api/v1/me')).json();
 expect((await page.request.patch('/api/v1/me/preferences',{headers:{'x-worklingo-account-id':user.id},data:{locale:'en'}})).ok()).toBe(true);
 await page.goto('/programs');
 const card=page.locator('.program-card-beginner');const summary=card.locator('summary');await summary.focus();await expect(summary).toBeFocused();await page.keyboard.press('Enter');await expect(card.locator('details')).toHaveAttribute('open','');
 await card.getByRole('button',{name:/Open .* program/}).click();await expect(page).toHaveURL(/\/dashboard$/);
 await page.goto('/programs');await page.getByRole('button',{name:'Program progress',exact:true}).click();await page.getByRole('heading',{name:'Recommended next action'}).locator('..').getByRole('button',{name:'Start lesson',exact:true}).click();await expect(page.locator('.activity-prompt')).toBeVisible();
 await page.getByRole('button',{name:'Pause session',exact:true}).click();await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Resume session',exact:true}).click();await expect(page.getByRole('button',{name:'Pause session',exact:true})).toBeVisible();
 await page.getByRole('combobox',{name:'Interface language',exact:true}).selectOption('vi');await expect(page.getByRole('button',{name:'Tạm dừng buổi học',exact:true})).toBeVisible();await expectNoHorizontalOverflow(page);await page.screenshot({path:path.join(evidence,`${info.project.name}-pause-resume-vi.png`),fullPage:true});
});
