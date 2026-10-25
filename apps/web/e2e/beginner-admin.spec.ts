import {test,expect} from '@playwright/test';
const api=()=>process.env.WORKLINGO_BEGINNER_API_BASE_URL!;
test.beforeEach(async({page,request})=>{
 const response=await request.get(api()+'/api/v1/admin/beginner');expect(response.status()).toBe(200);
 const data=await response.json();expect(data.environmentId).toBe(process.env.WORKLINGO_BEGINNER_ENVIRONMENT_ID);
 if(!data.environmentId||!process.env.WORKLINGO_BEGINNER_ENVIRONMENT_ID)throw Error('BLOCKED: dedicated test environment identity not confirmed');
 await page.route('**/*',route=>['127.0.0.1','localhost','::1'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
});
test('shows planned knowledge separately from real content and supports narrow keyboard layout',async({page})=>{
 const mutations:string[]=[];page.on('request',r=>{if(['POST','PATCH','PUT','DELETE'].includes(r.method()))mutations.push(r.url());});
 await page.goto('/admin/programs/beginner');await expect(page.getByRole('heading',{name:'Beginner curriculum'})).toBeVisible();
 await page.getByRole('button',{name:'Cơ bản',exact:true}).click();await expect(page.locator('summary').filter({hasText:'CB-A1'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.keyboard.press('Tab');expect(mutations).toEqual([]);
});
