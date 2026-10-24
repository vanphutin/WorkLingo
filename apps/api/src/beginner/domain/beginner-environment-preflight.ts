import { createHash } from 'node:crypto';
import { accessSync,constants,lstatSync,readFileSync,realpathSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { beginnerPermissionSchema,type BeginnerPermission } from '@worklingo/contracts';

function canonical(value:unknown):unknown {
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical((value as Record<string,unknown>)[k])]));
 return value;
}
export function hashBeginnerRecord(value:unknown):string{return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');}
export function validateBeginnerPermission(input:unknown,now=Date.now()):BeginnerPermission {
 const p=beginnerPermissionSchema.safeParse(input);
 if(!p.success)throw new Error('BEGINNER_PERMISSION_REQUIRED');
 const {recordHash,...record}=p.data;
 if(hashBeginnerRecord(record)!==recordHash)throw new Error('BEGINNER_PERMISSION_HASH_MISMATCH');
 if(Date.parse(record.expiresAt)<=now)throw new Error('BEGINNER_PERMISSION_EXPIRED');
 if(record.database.name!=='worklingo_beginner_r12a_'+record.runId||record.database.role!=='wl_beginner_'+record.runId)throw new Error('BEGINNER_ENVIRONMENT_MISMATCH');
 return p.data;
}
function inside(parent:string,child:string):boolean {const r=path.relative(parent,child);return r!==''&&!r.startsWith('..')&&!path.isAbsolute(r);}
function checkedRealPath(p:string):string {
 if(!path.isAbsolute(p))throw new Error('BEGINNER_UNSAFE_ROOT');
 const real=realpathSync(p);if(path.normalize(real)!==path.normalize(p))throw new Error('BEGINNER_UNSAFE_ROOT');
 for(let current=path.resolve(p);;current=path.dirname(current)){
  if(lstatSync(current).isSymbolicLink())throw new Error('BEGINNER_UNSAFE_ROOT');
  if(path.dirname(current)===current)break;
 }return real;
}
export function preflightBeginnerEnvironment(input:unknown,databaseUrl:string):BeginnerPermission {
 const p=validateBeginnerPermission(input);let url:URL;
 try{url=new URL(databaseUrl);}catch{throw new Error('BEGINNER_ENVIRONMENT_MISMATCH');}
 if(!['postgres:','postgresql:'].includes(url.protocol)||url.hostname.replace(/^\[|\]$/gu,'')!==p.database.host||Number(url.port||5432)!==p.database.port||decodeURIComponent(url.username)!==p.database.role||decodeURIComponent(url.pathname.slice(1))!==p.database.name||[...url.searchParams].some(([k,v])=>k!=='schema'||v!=='public'))throw new Error('BEGINNER_ENVIRONMENT_MISMATCH');
 const temp=checkedRealPath(p.ownedTempRoot),run=checkedRealPath(path.join(temp,p.runId));
 if(!inside(realpathSync(tmpdir()),temp))throw new Error('BEGINNER_UNSAFE_ROOT');
 for(const root of [p.storageRoot,p.registryRoot])if(!inside(run,checkedRealPath(root)))throw new Error('BEGINNER_UNSAFE_ROOT');
 const approval=checkedRealPath(p.approvalRoot);
 if(approval===temp||inside(temp,approval)||inside(approval,temp))throw new Error('BEGINNER_UNSAFE_APPROVAL_ROOT');
 let writable=true;try{accessSync(approval,constants.W_OK);}catch{writable=false;}
 if(writable)throw new Error('BEGINNER_APPROVAL_ROOT_WRITABLE');
 const marker=JSON.parse(readFileSync(path.join(run,'run.json'),'utf8')) as {runId?:string;environmentId?:string};
 if(marker.runId!==p.runId||marker.environmentId!==p.environmentId)throw new Error('BEGINNER_RUN_IDENTITY_MISMATCH');
 return p;
}
/** Operator-owned read-only records only. No endpoint writes this store. */
export async function readApprovedBeginnerPermission():Promise<BeginnerPermission|null>{
 const root=process.env.WORKLINGO_BEGINNER_APPROVAL_ROOT,id=process.env.WORKLINGO_BEGINNER_PERMISSION_ID;
 if(!root||!id)return null;
 if(!/^[a-zA-Z0-9_-]{1,100}$/u.test(id))throw new Error('BEGINNER_PERMISSION_REQUIRED');
 const real=checkedRealPath(root);let writable=true;try{accessSync(real,constants.W_OK);}catch{writable=false;}
 if(writable)throw new Error('BEGINNER_APPROVAL_ROOT_WRITABLE');
 const file=path.join(real,id+'.json');if(lstatSync(file).isSymbolicLink()||!lstatSync(file).isFile())throw new Error('BEGINNER_PERMISSION_REQUIRED');
 const p=validateBeginnerPermission(JSON.parse(readFileSync(file,'utf8')));
 if(p.approvalId!==id||checkedRealPath(p.approvalRoot)!==real)throw new Error('BEGINNER_PERMISSION_REQUIRED');
 return p;
}
