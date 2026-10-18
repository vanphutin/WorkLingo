import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateGraph, validateSources, hash, citations } from '../analyze/core.mjs';

const home=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const root=path.resolve(home,'../..');
const system=JSON.parse(await fs.readFile(path.join(home,'data/system.json'),'utf8'));
const sources=new Map();
const errors=validateGraph(system.items);
for (const entry of system.inventory) {
  if (entry.file.includes('..') || path.isAbsolute(entry.file)) { errors.push(`unsafe inventory path ${entry.file}`); continue; }
  try {
    const text=await fs.readFile(path.join(root,entry.file),'utf8');
    sources.set(entry.file,text);
    if (entry.sha256!==hash(text)) errors.push(`inventory stale ${entry.file}`);
  } catch { errors.push(`missing inventory source ${entry.file}`); }
}
errors.push(...validateSources(system.items,sources));
const moduleIds=new Set(system.items.filter(x=>x.kind==='module').map(x=>x.id));
for (const item of system.items) if (!moduleIds.has(item.module)) errors.push(`${item.id}: missing module ${item.module}`);
for (const entity of system.items.filter(x=>x.kind==='entity')) for (const r of entity.relations) {
  const target=system.items.find(x=>x.id===`ENT-${r.target}`);
  if (!target || r.to.some(f=>!target.fields.some(t=>t.name===f)) || r.from.some(f=>!entity.fields.some(t=>t.name===f))) errors.push(`${entity.id}: invalid FK ${r.field}`);
}
for (const entry of system.coverage) if (entry.analyzedFiles>entry.discoveredFiles || entry.discoveredFiles<1) errors.push(`${entry.module}: impossible coverage denominator`);
const serialized=JSON.stringify(system);
const secretPatterns=[/sk-[A-Za-z0-9_-]{24,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/postgres(?:ql)?:\/\/[^\s"@]+:[^\s"@]+@/,/Bearer\s+[A-Za-z0-9._-]{25,}/];
for (const pattern of secretPatterns) if (pattern.test(serialized)) errors.push(`Potential sensitive data in generated dataset: ${pattern.source}`);
if (errors.length) { console.error(errors.join('\n')); process.exitCode=1; }
else console.log(`Validated ${system.items.length} records, ${system.inventory.length} source hashes, ${system.items.reduce((n,x)=>n+citations(x).length,0)} evidence references and ${system.items.reduce((n,x)=>n+x.relatedIds.length,0)} relationships. No broken references or scanned secret patterns.`);
