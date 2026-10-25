import {test,expect} from '@playwright/test';
test('previews explicit published V1 after V2 without learner mutations or latest fallback',async({page,request})=>{
 const response=await request.get(process.env.WORKLINGO_BEGINNER_API_BASE_URL+'/api/v1/admin/beginner');expect(response.status()).toBe(200);
 const workspace=await response.json();if(!workspace.environmentId||workspace.environmentId!==process.env.WORKLINGO_BEGINNER_ENVIRONMENT_ID)throw Error('BLOCKED: environment identity mismatch');
 const binding=workspace.bindings.find((b:{lessonVersions:{status:string}[]})=>b.lessonVersions.filter(v=>v.status==='PUBLISHED').length>=2);
 if(!binding)throw Error('BLOCKED: actual V1/V2 published synthetic fixture required');
 const v1=[...binding.lessonVersions].filter((v:{status:string})=>v.status==='PUBLISHED').sort((a:{version:number},b:{version:number})=>a.version-b.version)[0];
 const outbound:string[]=[];await page.route('**/*',route=>['127.0.0.1','localhost','::1'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
 page.on('request',r=>{if(r.method()!=='GET'&&r.url().includes('/learning-sessions'))outbound.push(r.url());});
 await page.goto('/admin/programs/beginner');if(binding.editorialCode.startsWith('CB'))await page.getByRole('button',{name:'Cơ bản',exact:true}).click();
 await page.locator('summary').filter({hasText:new RegExp('^'+binding.editorialCode.split('-')[0]+' ·')}).click();
 await page.getByRole('button',{name:new RegExp('^'+binding.editorialCode+' ·')}).click();
 await page.getByLabel('Exact published LessonVersion').selectOption(v1.id);
 await page.getByRole('button',{name:'Learner preview',exact:true}).click();
 const preview=page.getByRole('region',{name:'Learner preview',exact:true});await expect(preview).toContainText(v1.id);
 await expect(preview).not.toContainText(/sampleAnswer|answerIndex|rubricId/);expect(outbound).toEqual([]);
});
