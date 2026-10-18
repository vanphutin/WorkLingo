import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const home=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(home,'scripts/analyze/core.mjs');
const original=await fs.readFile(file,'utf8');
const target='if (ids.has(item.id))';
if (!original.includes(target)) throw new Error('Mutation target changed; review the mutation test.');
try {
  await fs.writeFile(file,original.replace(target,'if (!ids.has(item.id))'));
  const result=spawnSync(process.execPath,['--test','tests/extraction.test.mjs'],{cwd:home,encoding:'utf8'});
  if(result.status===0 || !result.stdout.includes('not ok')) throw new Error('Mutation survived or tests did not run');
  await fs.writeFile(path.join(home,'reports/mutation-check.json'),JSON.stringify({executedAt:new Date().toISOString(),mutation:'Inverted duplicate-ID validation condition',result:'KILLED',testExitCode:result.status,restored:true},null,2)+'\n');
  console.log('Duplicate-ID mutation was caught by the tests; source restored.');
} finally {await fs.writeFile(file,original);}
