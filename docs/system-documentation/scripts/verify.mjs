import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const home=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const reports=[];
const checks=[['test',['--test']],['lint',['node_modules/eslint/bin/eslint.js','src','scripts','tests','--config','eslint.config.mjs']],['typecheck',['node_modules/typescript/bin/tsc','--noEmit','-p','tsconfig.json']],['validate',['scripts/validate/validate.mjs']],['build',['scripts/build.mjs']]];
for (const [name,args] of checks) {
  const started=Date.now();
  try {const output=execFileSync(process.execPath,args,{cwd:home,encoding:'utf8'});process.stdout.write(output);reports.push({name,result:'PASS',durationMs:Date.now()-started,output});}
  catch(error) {process.stdout.write(error.stdout??'');process.stderr.write(error.stderr??'');reports.push({name,result:'FAIL',output:String(error)});await fs.writeFile(path.join(home,'reports/verification.json'),JSON.stringify({executedAt:new Date().toISOString(),checks:reports},null,2)+'\n');throw error;}
}
await fs.writeFile(path.join(home,'reports/verification.json'),JSON.stringify({executedAt:new Date().toISOString(),checks:reports,productionTests:'NOT_RUN'},null,2)+'\n');
console.log('Documentation verification gates passed. Browser smoke tests run separately against the production preview.');
