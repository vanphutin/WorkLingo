import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { auditRoutes, prepareAuditRoute } from './fixtures/phase5-routes';
const evidence=path.resolve(__dirname,'../../../docs/ui-redesign/evidence/phase5');
const run=process.env.WORKLINGO_PHASE5_RUN??'before';
test.afterEach(({},info)=>{ const dir=path.join(evidence,run);mkdirSync(dir,{recursive:true});writeFileSync(path.join(dir,info.title.replace(/[^a-z0-9]+/giu,'-')+'.json'),JSON.stringify({title:info.title,status:info.status,fixtures:true,observations:records.splice(0)},null,2)+'\n'); });
const records:object[]=[];
for(const theme of ['light','dark']) for(const [width,height] of [[320,844],[360,844],[390,844],[768,1024],[1440,900]]) test(`route audit ${theme} ${width}`,async({page})=>{
  await page.context().addCookies([{name:'worklingo_locale',value:'vi',domain:'127.0.0.1',path:'/'}]); await page.addInitScript(t=>localStorage.setItem('worklingo:theme:v1',t),theme); await page.setViewportSize({width:width!,height:height!});
  const cdp=await page.context().newCDPSession(page);await cdp.send('Accessibility.enable');
  for(const item of auditRoutes){
    await prepareAuditRoute(page,item);await page.goto('http://127.0.0.1:33300'+item[1]);await expect(page.locator(item[2]).first(),item[1]).toBeVisible();
    const ax=await cdp.send('Accessibility.getFullAXTree'); const accessible=ax.nodes.filter(n=>!n.ignored); const roles=['button','link','textbox','combobox','checkbox','radio','slider'];
    const names=accessible.filter(n=>roles.includes(n.role?.value)&&!n.name?.value).map(n=>({role:n.role?.value,node:n.backendDOMNodeId}));
    const ui=await page.evaluate(()=>{
      const visible=(el:Element)=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
      const glass=[...document.querySelectorAll('.glass-surface')].filter(visible).map(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return{class:el.className,variant:el.getAttribute('data-glass-variant'),blur:s.backdropFilter,background:s.backgroundColor,nested:!!el.parentElement?.closest('.glass-surface'),viewportArea:Math.max(0,Math.min(r.right,innerWidth)-Math.max(0,r.left))*Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(0,r.top))/(innerWidth*innerHeight)};});
      const styles=[...document.querySelectorAll('h1,h2,p,button,input,select,textarea')].filter(visible).slice(0,100).map(el=>{const s=getComputedStyle(el);return{tag:el.tagName,class:el.className,size:s.fontSize,lineHeight:s.lineHeight,radius:s.borderRadius,font:s.fontFamily,color:s.color,background:s.backgroundColor,transition:s.transitionProperty};});
      return{width:innerWidth,scroll:document.documentElement.scrollWidth,mainCount:document.querySelectorAll('main,[role=main]').length,nestedMain:document.querySelectorAll('main main').length,h1:[...document.querySelectorAll('h1')].filter(visible).map(el=>el.textContent),glass,styles};
    });
    records.push({route:item[1],theme,...ui,unnamedControls:names,headings:accessible.filter(n=>n.role?.value==='heading').map(n=>({name:n.name?.value,level:n.properties?.find(p=>p.name==='level')?.value.value}))});
    expect.soft(ui.scroll,item[1]+' document reflow').toBeLessThanOrEqual(width!);expect.soft(ui.mainCount,item[1]+' one main').toBe(1);expect.soft(ui.nestedMain,item[1]+' no nested main').toBe(0);expect.soft(ui.h1,item[1]+' one page heading').toHaveLength(1);expect.soft(names,item[1]+' named controls').toEqual([]);
  }
});
