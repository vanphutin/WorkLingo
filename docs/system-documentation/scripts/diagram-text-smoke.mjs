import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const home=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=process.env.DOCS_URL??'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const results=[];
try {
  await page.goto(base);
  await page.locator('#content[aria-busy="false"]').waitFor();
  for(const theme of ['light','dark']) {
    const result=await page.evaluate(async theme=>{
      document.documentElement.dataset.theme=theme;
      const {renderDiagram}=await import('./src/diagrams.js');
      const host=document.createElement('div');document.querySelector('#content').replaceChildren(host);
      const item={id:'diagram-text-regression',name:'Text regression',kind:'diagram',code:'flowchart LR\n A["Readable label"] -->|Edge label| B["Second label"]'};
      await renderDiagram(host,item,{byId:new Map()});
      const svg=host.querySelector('svg');
      const nodes=[...svg.querySelectorAll('g.node')].map(n=>({text:n.textContent.trim(),nativeText:n.querySelectorAll('text,tspan').length}));
      return {theme,nodes,edgeText:[...svg.querySelectorAll('.edgeLabel')].map(n=>n.textContent.trim()),foreignObjects:svg.querySelectorAll('foreignObject').length};
    },theme);
    for(const expected of ['Readable label','Second label']) if(!result.nodes.some(n=>n.text.includes(expected)&&n.nativeText>0)) throw new Error(`${theme}: missing visible native SVG node text ${expected}; actual ${JSON.stringify(result)}`);
    if(!result.edgeText.some(text=>text.includes('Edge label'))) throw new Error(`${theme}: missing edge text`);
    if(result.foreignObjects!==0) throw new Error(`${theme}: unexpected HTML label container`);
    results.push(result);
  }
  await page.goto(base+'#item/DIA-module-dependencies');
  await page.locator('.diagram-viewport svg').waitFor();
  const labels=await page.locator('.diagram-viewport g.node').evaluateAll(nodes=>nodes.map(n=>n.textContent.trim()));
  if(labels.length===0||labels.some(text=>!text)) throw new Error('Real module dependency diagram contains blank nodes');
  await page.screenshot({path:path.join(home,'reports/screenshots/text-issue-after.png')});
  await fs.writeFile(path.join(home,'reports/diagram-text-smoke.json'),JSON.stringify({executedAt:new Date().toISOString(),results,dependencyNodeCount:labels.length,result:'PASS'},null,2)+'\n');
  console.log(`PASS native SVG labels and edge text in both themes; ${labels.length} real module nodes retain text after sanitization.`);
} finally {await browser.close();}
