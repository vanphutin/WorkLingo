import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { auditRoutes, prepareAuditRoute } from './fixtures/phase5-routes';
const evidence=path.resolve(__dirname,'../../../docs/ui-redesign/evidence/phase5');
const run=process.env.WORKLINGO_PHASE5_RUN??'before';const records:object[]=[];
test.afterEach(({},info)=>{const dir=path.join(evidence,run);mkdirSync(dir,{recursive:true});writeFileSync(path.join(dir,info.title.replace(/[^a-z0-9]+/giu,'-')+'.json'),JSON.stringify({title:info.title,status:info.status,observations:records.splice(0),fixtures:true},null,2)+'\n');});
async function open(page:Page,url:string,theme='light'){await page.context().addCookies([{name:'worklingo_locale',value:'vi',domain:'127.0.0.1',path:'/'}]);await page.addInitScript(t=>{if(t==='system')localStorage.removeItem('worklingo:theme:v1');else localStorage.setItem('worklingo:theme:v1',t);},theme);const item=auditRoutes.find(item=>item[1]===url)!;await prepareAuditRoute(page,item);await page.goto('http://127.0.0.1:33300'+url);await expect(page.locator(item[2]).first()).toBeVisible();}
test('AI content is solid without redundant manual dark backdrop filtering',async({page})=>{
  for(const theme of ['light','dark','system']){await page.emulateMedia({colorScheme:'dark'});await open(page,'/admin/settings/ai',theme);const styles=await page.locator('.admin-ai-card').evaluateAll(els=>els.map(el=>({background:getComputedStyle(el).backgroundColor,filter:getComputedStyle(el).backdropFilter})));records.push({theme,styles});const out=path.join(evidence,run);mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,`ai-solid-${theme}.png`),fullPage:true});for(const style of styles)expect.soft(style.filter).toBe('none');}
});
test('sr-only table captions and progress labels remain accessible without visible layout',async({page})=>{
  await open(page,'/admin/operations');const caption=page.locator('caption');const bounds=await caption.boundingBox();records.push({caption:bounds});expect.soft(bounds!.width).toBeLessThanOrEqual(1);expect.soft(bounds!.height).toBeLessThanOrEqual(1);await expect(page.getByRole('table')).toHaveAccessibleName(/\S/u);
  const out=path.join(evidence,run);mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'operations-caption.png'),fullPage:true});
  await open(page,'/ielts/practice');for(const label of await page.locator('.sr-only').all()){expect.soft((await label.boundingBox())!.width).toBeLessThanOrEqual(1);}await expect(page.getByRole('combobox').last()).toHaveAccessibleName(/\S/u);
});
test('owner motion budgets exclude layout transitions and honor reduced motion across audio AI curriculum',async({page})=>{
  for(const [url,selectors] of [['/settings/ai','.admin-ai-select,.admin-ai-toggle-card,.admin-ai-insight-item'],['/admin/curriculum','.action-button'],['/admin/settings/audio','.admin-save-btn']] as const){
    await open(page,url);await page.emulateMedia({reducedMotion:'no-preference'});const transitions=await page.locator(selectors).evaluateAll(els=>els.map(el=>({class:el.className,properties:getComputedStyle(el).transitionProperty,duration:getComputedStyle(el).transitionDuration})));records.push({url,transitions});for(const x of transitions)expect.soft(x.properties).not.toBe('all');await page.emulateMedia({reducedMotion:'reduce'});const reduced=await page.locator(selectors).evaluateAll(els=>els.map(el=>({class:el.className,transition:getComputedStyle(el).transitionDuration,animation:getComputedStyle(el).animationName})));records.push({url,reduced});for(const x of reduced)expect.soft(x.transition).toMatch(/^0s(?:, 0s)*$/u);
  }
});
test('loading AI indicator honors reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.context().addCookies([{name:'worklingo_locale',value:'vi',domain:'127.0.0.1',path:'/'}]);
  const item = auditRoutes.find(item => item[1] === '/settings/ai')!;
  await prepareAuditRoute(page, item);
  await page.route('**/api/v1/me/ai-settings', () => {});
  await page.goto('http://127.0.0.1:33300/settings/ai');
  const spinner = page.locator('.admin-ai-state-container .admin-spinner');
  await expect(spinner).toBeVisible();
  const animation = await spinner.evaluate(el => getComputedStyle(el).animationName);
  records.push({ url: '/settings/ai', state: 'loading', reducedMotion: true, animation });
  expect(animation).toBe('none');
});
test('remediation screenshots preserve equivalent route theme and viewport conditions', async ({ page }) => {
  const dir = path.join(evidence, run); mkdirSync(dir, { recursive: true });
  for (const theme of ['light', 'dark']) for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    for (const url of ['/login', '/settings', '/admin/content', '/admin/operations', '/settings/ai']) {
      await open(page, url, theme);
      const slug = url.slice(1).replaceAll('/', '-') || 'home';
      await page.screenshot({ path: path.join(dir, `${slug}-${theme}-${width}.png`), fullPage: true });
      records.push({ url, theme, width, height: width === 390 ? 844 : 900, locale: 'vi' });
    }
  }
});
const luminance=(a:number[])=>a.slice(0,3).map(n=>{const c=n/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i]!,0);
const ratio=(a:number[],b:number[])=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
for(const theme of ['light','dark']) test(`actual glass composite text and native control contrast ${theme}`,async({page})=>{
  for(const url of ['/','/login','/dashboard','/mastery','/ielts/orientation','/settings','/admin/content']){
    await open(page,url,theme);for(const surface of await page.locator('.glass-surface:visible').all()){
      const probe=await surface.evaluateHandle(el=>{const p=document.createElement('span');p.dataset.phase5Probe='true';p.setAttribute('aria-hidden','true');p.style.cssText='position:absolute;right:8px;bottom:8px;width:8px;height:8px;pointer-events:none;background:transparent';el.append(p);return p;});
      const png=await page.locator('[data-phase5-probe]').screenshot();const background=await page.evaluate(async(data)=>{const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);return[...ctx.getImageData(4,4,1,1).data].slice(0,3);},png.toString('base64'));
      const colors=await surface.evaluate(el=>{const target=el.querySelector('.workspace-nav-group-label,.brand-logo,.public-brand-link,p,small')??el;return{class:el.className,variant:el.getAttribute('data-glass-variant'),foreground:getComputedStyle(target).color.match(/[\d.]+/g)!.map(Number),filter:getComputedStyle(el).backdropFilter};});const measured=ratio(colors.foreground,background);records.push({url,theme,kind:'screenshot-composite',...colors,background,ratio:measured});expect.soft(measured,url+' glass').toBeGreaterThanOrEqual(4.5);await probe.evaluate(el=>el.remove());await probe.dispose();
    }
    const fields=page.locator('select:visible,input:not([type=checkbox]):not([type=radio]):visible,textarea:visible');for(const field of await fields.all()){
      if(await field.isDisabled())continue;const colors=await field.evaluate(el=>{const s=getComputedStyle(el),rgb=(s:string)=>s.match(/[\d.]+/g)!.map(Number);return{class:el.className,background:rgb(s.backgroundColor),border:rgb(s.borderTopColor),foreground:rgb(s.color)};});if((colors.background[3]??1)!==1)continue;const boundary=ratio(colors.border,colors.background);records.push({url,kind:'control-boundary',...colors,ratio:boundary});expect.soft(boundary,url+' boundary').toBeGreaterThanOrEqual(3);
    }
  }
});
