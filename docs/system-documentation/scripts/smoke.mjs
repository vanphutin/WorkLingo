import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const home=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=process.env.DOCS_URL??'http://127.0.0.1:4173/';
const data=JSON.parse(await fs.readFile(path.join(home,'data/system.json'),'utf8'));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const page=await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
const checks=[];
let renderedDiagramCount=0;
const check=async(name,fn)=>{ await fn(); checks.push({name,result:'PASS'}); console.log(`PASS ${name}`); };
const ready=()=>page.locator('#content[aria-busy="false"]').waitFor();
try {
  await check('Overview loads the real snapshot',async()=>{
    const r=await page.goto(base); if(!r.ok()) throw new Error(`HTTP ${r.status()}`); await ready();
    if(!(await page.locator('#content').innerText()).includes(data.meta.commit)) throw new Error('Commit snapshot missing');
  });
  await check('All 16 navigation sections load',async()=>{
    const links=await page.locator('#primary-nav a[data-section]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
    if(links.length<16) throw new Error(`Only ${links.length} sections`);
    for(const link of links) {await page.goto(base+link);await ready();if(await page.locator('#content [role="alert"]').count()) throw new Error(`Alert ${link}`);}
  });
  await check('Global search, zero results and combined API filters',async()=>{
    await page.goto(base+'#search?q=LearningSession'); await ready();
    if(!(await page.locator('#results-status').innerText()).match(/[1-9]/)) throw new Error('Search did not find actual entity');
    await page.goto(base+'#search?q=does-not-exist-7999123'); await ready();
    if(!(await page.locator('#results-status').innerText()).startsWith('0')) throw new Error('Empty result was fabricated');
    await page.goto(base+'#apis?module=MOD-auth&method=POST&authentication=PUBLIC'); await ready();
    if(!(await page.locator('#content').innerText()).includes('/api/v1/auth/login')) throw new Error('Auth filter loses public login route');
  });
  await check('Deep links, inbound/outbound traceability and source panel',async()=>{
    await page.goto(base+'#item/ENT-User'); await ready();
    if(!(await page.locator('#page-heading h1').innerText()).includes('User')) throw new Error('Entity deep link failed');
    await page.getByRole('button',{name:'Mở bảng bằng chứng',exact:true}).click();
    await page.locator('#evidence-dialog[open]').waitFor();
    if(!(await page.locator('#evidence-content').innerText()).includes('schema.prisma')) throw new Error('Evidence missing');
    await page.keyboard.press('Escape');
    if(await page.locator('#evidence-dialog[open]').count()) throw new Error('Dialog escape failed');
    if(!(await page.locator('#content a[href^="#item/"]').count())) throw new Error('Crosslinks missing');
  });
  await check('Every generated Mermaid diagram parses and renders',async()=>{
    const diagrams=data.items.filter(x=>x.kind==='diagram');
    const result=await page.evaluate(async graphs=>{
      const {default:mermaid}=await import('./vendor/mermaid.js');
      mermaid.initialize({startOnLoad:false,securityLevel:'strict',htmlLabels:false,maxTextSize:100000,flowchart:{htmlLabels:false},suppressErrorRendering:true});
      const results=[];
      for(const [i,g] of graphs.entries()) {
        try { await mermaid.parse(g.code); const svg=await mermaid.render(`smoke-${i}`,g.code); if(!svg.svg.includes('<svg')) throw new Error('missing SVG'); results.push({id:g.id,ok:true}); }
        catch(e) { results.push({id:g.id,ok:false,error:String(e)}); }
      }
      return results;
    },diagrams);
    const failures=result.filter(x=>!x.ok); if(failures.length) throw new Error(JSON.stringify(failures));
    renderedDiagramCount=diagrams.length;
  });
  await check('Diagram zoom, fit, accessible navigation and node interaction',async()=>{
    await page.goto(base+'#item/DIA-module-dependencies');await ready();
    await page.locator('.diagram-viewport svg').waitFor({timeout:30000});
    const nodeLabels=await page.locator('.diagram-viewport g.node').evaluateAll(nodes=>nodes.map(node=>node.textContent.trim()));
    if(!nodeLabels.length||nodeLabels.some(text=>!text)) throw new Error('Diagram node labels were lost after sanitization');
    const svg=page.locator('.diagram-viewport svg').first(); const old=await svg.getAttribute('viewBox');
    await page.getByRole('button',{name:'Phóng to',exact:true}).click();
    if(await svg.getAttribute('viewBox')===old) throw new Error('Zoom did not change viewBox');
    await page.getByRole('button',{name:'Vừa khung',exact:true}).click();
    if(await svg.getAttribute('viewBox')!==old) throw new Error('Fit did not restore view');
    const node=page.locator('.diagram-viewport [data-atlas-item]').first();
    const target=await node.getAttribute('data-atlas-item');
    await node.focus(); await page.keyboard.press('Enter'); await ready();
    if(!page.url().includes('#item/'+target)) throw new Error('Diagram Enter navigation failed');
    await page.goto(base+'#item/DIA-module-dependencies');await ready();
    await page.locator('.diagram-viewport [data-atlas-item]').first().waitFor({timeout:30000});
    await page.locator('.diagram-viewport [data-atlas-item]').first().click(); await ready();
    if(!page.url().includes('#item/'+target)) throw new Error('Diagram node click navigation failed');
  });
  await check('Light/dark theme persists across reload',async()=>{
    await page.locator('#theme-toggle').click(); const theme=await page.locator('html').getAttribute('data-theme');
    await page.reload();await ready();if(await page.locator('html').getAttribute('data-theme')!==theme) throw new Error('Theme lost');
  });
  await check('Nested static-host paths preserve assets and deep links',async()=>{
    await page.goto(new URL('atlas/#item/ENT-User',base).href);await ready();
    if(!(await page.locator('#page-heading h1').innerText()).includes('User')) throw new Error('Nested path failed');
  });
  await fs.mkdir(path.join(home,'reports/screenshots'),{recursive:true});
  await page.goto(base+'#overview');await ready();
  await page.screenshot({path:path.join(home,'reports/screenshots/desktop.png'),fullPage:true});
  await check('375px mobile layout, menu and keyboard escape',async()=>{
    await page.setViewportSize({width:375,height:812});
    await page.goto(base+'#apis');await ready();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    if(overflow) throw new Error('Body horizontal overflow at 375px');
    await page.locator('#menu-toggle').click(); if(await page.locator('#menu-toggle').getAttribute('aria-expanded')!=='true') throw new Error('Menu not open');
    await page.keyboard.press('Escape'); if(await page.locator('#menu-toggle').getAttribute('aria-expanded')!=='false') throw new Error('Menu not closed');
    await page.locator('#menu-toggle').click();
    await page.locator('.brand').click();
    if(await page.locator('#menu-toggle').getAttribute('aria-expanded')!=='false') throw new Error('Brand navigation leaves mobile overlay open');
    await page.screenshot({path:path.join(home,'reports/screenshots/mobile.png'),fullPage:true});
  });
  await check('Unknown record route remains actionable',async()=>{
    await page.goto(base+'#item/MISSING-ID');await ready();
    if(!(await page.locator('#content').innerText()).includes('không có trong snapshot')) throw new Error('Missing record UX');
  });
  await check('Missing snapshot reports an error and retry loads the real data',async()=>{
    const failurePage=await context.newPage();
    await failurePage.route('**/data/system.json',route=>route.fulfill({status:503,body:'Unavailable'}));
    await failurePage.goto(base);
    await failurePage.getByRole('alert').waitFor();
    if(!(await failurePage.getByRole('alert').innerText()).includes('data/system.json')) throw new Error('Error state omits recovery context');
    await failurePage.unroute('**/data/system.json');
    await failurePage.getByRole('button',{name:'Thử tải lại',exact:true}).click();
    await failurePage.locator('#content[aria-busy="false"]').waitFor();
    if(await failurePage.getByRole('alert').count()) throw new Error('Retry did not recover');
    await failurePage.close();
  });
  if(errors.length) throw new Error('Browser runtime errors: '+errors.join('\n'));
  const report={executedAt:new Date().toISOString(),base,checks,diagrams:renderedDiagramCount,consoleErrors:errors,productionTests:'NOT_RUN',browser:'Chromium headless'};
  await fs.writeFile(path.join(home,'reports/ui-smoke.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`Completed ${checks.length} browser checks without console/runtime errors.`);
} finally {await browser.close();}
