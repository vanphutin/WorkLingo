import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,rmdirSync,renameSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import type {PrismaService} from '../../src/common/database/prisma.service.js';
import type {BootstrapSqlPort,TableDigest} from './run.js';
import {beginnerEditorialPlan,hashBeginnerManifest,type BeginnerTarget} from '@worklingo/contracts';
import {syntheticBeginnerSource} from '../fixtures/beginner/authoring/fixture-factory.js';
import {assertRuntimeSql,checkedRunPath,verifyWindow,sha256,type RunWindow} from './environment.js';
import {ObjectStorage,type PutObjectInput,type StoredObject} from '../../src/storage/domain/object-storage.port.js';
import {Prisma} from '@prisma/client';
import type {MainScope} from './environment.js';
import {hashBeginnerRecord} from '../../src/beginner/domain/beginner-environment-preflight.js';
type HistoricalRows={version:unknown;curriculum:unknown;snapshot:unknown};
type HistoricalHashes=Record<keyof HistoricalRows,string>;
export function captureHistoricalHashes(rows:HistoricalRows):HistoricalHashes{
 const hash=(v:unknown)=>hashBeginnerRecord(JSON.parse(JSON.stringify(v)));
 return {version:hash(rows.version),curriculum:hash(rows.curriculum),snapshot:hash(rows.snapshot)};
}
export function verifyHistoricalHashes(before:HistoricalHashes,rows:HistoricalRows):void{
 if(hashBeginnerRecord(before)!==hashBeginnerRecord(captureHistoricalHashes(rows)))throw Error('MAIN_HISTORICAL_CONTENT_CHANGED');
}
export interface OwnedRow {model:string;keys:Record<string,string>}
export interface RunLedger {runId:string;rows:OwnedRow[];allowedModels:string[];uniqueKeys:Record<string,string>;maxRows:number;files?:Array<{path:string;sha256:string;bytes:number;deleted:boolean}>}
type Data=Record<string,unknown>;
function object(v:unknown):Data{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('MAIN_FIXTURE_SHAPE');return v as Data;}
function model(name:string){const value=Prisma.dmmf.datamodel.models.find(m=>m.name===name);if(!value)throw Error('MAIN_FIXTURE_SHAPE');return value;}
export function newRunLedger(scope:MainScope):RunLedger{return {runId:scope.environment.runId,rows:[],allowedModels:[...scope.runtimeRole.dmlTablesInitiallyEmpty,...scope.runtimeRole.insertSelectOnlyTablesInitiallyEmpty],uniqueKeys:{},maxRows:scope.dataPreservation.limits.totalCreatedRows};}
export function planCreate(ledger:RunLedger,name:string,value:unknown,inherited:Data={}):void{
 if(!ledger.allowedModels.includes(name))throw Error('MAIN_FIXTURE_SCOPE');
 const data=object(value),meta=model(name),pk=meta.primaryKey?.fields??meta.fields.filter(f=>f.isId).map(f=>f.name);
 if(pk.length===1&&pk[0]==='id'){
  const unique=typeof data.slug==='string'?name+':'+data.slug:undefined;
  data.id??=unique&&ledger.uniqueKeys[unique]||randomUUID();
  if(unique)ledger.uniqueKeys[unique]=String(data.id);
 }
 for(const field of meta.fields.filter(f=>f.kind==='object')){
  const relation=data[field.name];if(!relation)continue;const ops=object(relation);
  if(ops.connectOrCreate||ops.upsert||ops.deleteMany||ops.updateMany)throw Error('MAIN_FIXTURE_SCOPE');
  const children=ops.create?[...(Array.isArray(ops.create)?ops.create:[ops.create])]:ops.createMany?object(ops.createMany).data:[];
  for(const child of Array.isArray(children)?children:[]){
   const childData=object(child),opposite=model(field.type).fields.find(f=>f.kind==='object'&&f.type===name&&f.relationName===field.relationName);
   const inheritedKeys:Data={};
   if(opposite?.relationFromFields?.length)for(let i=0;i<opposite.relationFromFields.length;i++){const from=opposite.relationFromFields[i],to=opposite.relationToFields?.[i];if(from&&to)inheritedKeys[from]=data[to]??inherited[to];}
   // Prisma supplies parent FKs in nested inputs. Infer ledger keys separately.
   planCreate(ledger,field.type,childData,inheritedKeys);
  }
 }
 const keys:Record<string,string>={};for(const key of pk){const value=data[key]??inherited[key];if(value===undefined||value===null)throw Error('MAIN_FIXTURE_SHAPE');keys[key]=String(value);}
 if(!pk.length)throw Error('MAIN_FIXTURE_SHAPE');
 if(!ledger.rows.some(r=>r.model===name&&JSON.stringify(r.keys)===JSON.stringify(keys)))ledger.rows.push({model:name,keys});
 if(ledger.rows.length>ledger.maxRows)throw Error('MAIN_FIXTURE_LIMIT');
}
function ownedWhere(ledger:RunLedger,name:string,value:unknown):boolean{
 const where=object(value);if(where.NOT)return false;
 if(where.OR&&(!Array.isArray(where.OR)||!where.OR.every(w=>ownedWhere(ledger,name,w))))return false;
 const ownIds=new Set(ledger.rows.filter(r=>r.model===name).flatMap(r=>Object.values(r.keys))),allIds=new Set(ledger.rows.flatMap(r=>Object.values(r.keys)));
 let restricted=false;
 for(const [key,value]of Object.entries(where)){
  if(key==='AND'){const list=Array.isArray(value)?value:[value];if(list.some(w=>ownedWhere(ledger,name,w)))restricted=true;continue;}
  if(key==='OR'){restricted=true;continue;}
  if(key==='id'||key.endsWith('Id')){
   const ids=typeof value==='string'?[value]:value&&typeof value==='object'&&'in'in value&&Array.isArray(value.in)?value.in:[];
   if(!ids.length||!ids.every(id=>typeof id==='string'&&(key==='id'?ownIds:allIds).has(id)))return false;restricted=true;
  }
  if(key==='slug'&&typeof value==='string'&&ledger.uniqueKeys[name+':'+value])restricted=true;
 }
 return restricted;
}
export function authorizeFixtureWrite(ledger:RunLedger,name:string,operation:string,value:unknown):void{
 if(!ledger.allowedModels.includes(name))throw Error('MAIN_FIXTURE_SCOPE');const args=object(value);
 if(operation==='create'){planCreate(ledger,name,args.data);return;}
 if(operation==='createMany'||operation==='createManyAndReturn'){for(const data of Array.isArray(args.data)?args.data:[args.data])planCreate(ledger,name,data);return;}
 if(operation==='upsert'){
  const where=object(args.where);
  if(!(typeof where.slug==='string'&&where.slug.includes(ledger.runId))&&!ownedWhere(ledger,name,where))throw Error('MAIN_FIXTURE_SCOPE');
  planCreate(ledger,name,args.create);return;
 }
 if(!['update','updateMany','delete','deleteMany'].includes(operation)||!ownedWhere(ledger,name,args.where))throw Error('MAIN_FIXTURE_SCOPE');
 const data=args.data&&typeof args.data==='object'?args.data as Data:{};
 for(const key of model(name).primaryKey?.fields??model(name).fields.filter(f=>f.isId).map(f=>f.name))if(key in data)throw Error('MAIN_FIXTURE_SCOPE');
}
export function authorizeProtectedRead(ledger:RunLedger,name:string,operation:string,args:Data,sessionHashes:readonly string[]):void{
 if(operation==='count')return;
 const where=args.where;
 if(name==='UserSession'&&where&&typeof where==='object'&&sessionHashes.includes(String((where as Data).tokenHash)))return;
 if(!where||!ownedWhere(ledger,name,where))throw Error('MAIN_PROTECTED_READ');
}
export function namespaceFixtureSource(source:string,runId:string,tag:string):string{
 if(!/^[a-z0-9]+$/u.test(runId)||!/^mg0[12]-l[1-4]$/u.test(tag))throw Error('MAIN_FIXTURE_SCOPE');
 const tokens=[...source.matchAll(/^\[{1,2}(?:WORD_BANK|LANGUAGE_BLOCK|CONTENT|AUDIO_SCRIPT|ACTIVITY|OBJECTIVE|INSTRUCTION)\s+([a-z0-9-]+)\]{1,2}/gmu)].map(m=>m[1]!).sort((a,b)=>b.length-a.length);
 for(const token of new Set(tokens))source=source.replace(new RegExp('(?<![a-zA-Z0-9-])'+token+'(?![a-zA-Z0-9-])','gu'),'f-'+runId+'-'+tag+'-'+token);
 return source.replace(/(^\[LESSON\]\s*\r?\nslug:\s*)[^\r\n]+/mu,'$1fixture-'+runId+'-'+tag);
}
export interface LedgerStore {read():RunLedger;change<T>(fn:(ledger:RunLedger)=>T):Promise<T>}
export class MainFixtureStorage extends ObjectStorage{
 constructor(private readonly scope:MainScope,private readonly store:LedgerStore){super();}
 private file(key:string){return checkedRunPath(this.scope,path.join(this.scope.environment.filesystem.storageRoot,key));}
 async put(input:PutObjectInput):Promise<StoredObject>{
  if(!input.prefix.includes(this.scope.environment.runId)&&!this.store.read().rows.some(r=>Object.values(r.keys).some(id=>input.prefix.includes(id))))throw Error('MAIN_STORAGE_OWNERSHIP');
  const key=input.prefix+'/'+randomUUID(),file=this.file(key),bytes=Buffer.from(input.body);
  await this.store.change(l=>{const files=l.files??=[];if(files.reduce((n,f)=>n+f.bytes,0)+bytes.length>this.scope.dataPreservation.limits.storageBytes)throw Error('MAIN_STORAGE_LIMIT');files.push({path:file,sha256:sha256(bytes),bytes:bytes.length,deleted:false});});
  mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,bytes,{flag:'wx'});return {key,size:bytes.length,contentType:input.contentType};
 }
 async read(key:string):Promise<Buffer>{const file=this.file(key),owned=this.store.read().files?.find(f=>f.path===file&&!f.deleted);if(!owned)throw Error('MAIN_STORAGE_OWNERSHIP');const bytes=readFileSync(file);if(bytes.length!==owned.bytes||sha256(bytes)!==owned.sha256)throw Error('MAIN_STORAGE_CHANGED');return bytes;}
 async delete(key:string):Promise<void>{const file=this.file(key);await this.read(key);unlinkSync(file);await this.store.change(l=>{l.files!.find(f=>f.path===file)!.deleted=true;});}
}
export function fileLedgerStore(scope:MainScope,window:RunWindow):LedgerStore{
 const file=checkedRunPath(scope,path.join(scope.environment.filesystem.runRoot,'ledger.json')),lock=file+'.lock';
 return {read:()=>JSON.parse(readFileSync(file,'utf8')) as RunLedger,async change(fn){
  verifyWindow(window,'cleanup');let acquired=false;
  for(let n=0;n<100;n++){try{mkdirSync(lock);acquired=true;break;}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;await new Promise(r=>setTimeout(r,20));}}
  if(!acquired)throw Error('MAIN_LEDGER_LOCK');
  try{const ledger=JSON.parse(readFileSync(file,'utf8')) as RunLedger;if(ledger.runId!==scope.environment.runId)throw Error('MAIN_LEDGER_IDENTITY');const result=fn(ledger),tmp=file+'.'+randomUUID()+'.tmp';writeFileSync(tmp,JSON.stringify(ledger),{flag:'wx'});renameSync(tmp,file);return result;}finally{rmdirSync(lock);}
 }};
}
/** The extension follows interactive transactions; intent keys are durable before each SQL write. */
export function guardedFixtureClient(scope:MainScope,base:PrismaService,store:LedgerStore,sessionHashes:readonly string[]=[]):PrismaService{
 const writes=new Set(['create','createMany','createManyAndReturn','upsert','update','updateMany','updateManyAndReturn','delete','deleteMany']);
 return base.$extends({query:{$allOperations:async({model:name,operation,args,query})=>{
  if(!name){
   if(!['$queryRaw','$executeRaw'].includes(operation))throw Error('MAIN_UNSAFE_SQL');
   const raw=args as unknown as [TemplateStringsArray,...unknown[]];assertRuntimeSql(Array.isArray(raw[0])?raw[0].join(' ? '):'');return query(args);
  }
  if(writes.has(operation)){
   if(scope.runtimeRole.insertSelectOnlyTablesInitiallyEmpty.includes(name)&&!['create','createMany','createManyAndReturn'].includes(operation))throw Error('MAIN_FIXTURE_SCOPE');
   await store.change(ledger=>authorizeFixtureWrite(ledger,name,operation,args));
  }else if(scope.runtimeRole.readOnlyProtected.includes(name))authorizeProtectedRead(store.read(),name,operation,args as Data,sessionHashes);
  else if(name!=='LearningProgram'&&!scope.runtimeRole.dmlTablesInitiallyEmpty.includes(name)&&!scope.runtimeRole.insertSelectOnlyTablesInitiallyEmpty.includes(name))throw Error('MAIN_PROTECTED_READ');
  return query(args);
 }}}) as unknown as PrismaService;
}
export interface FixtureDescriptor {target:BeginnerTarget;editorId:string;reviewerId:string;manifest:unknown;historicalHashes?:HistoricalHashes;historicalSessionId?:string;learnerId?:string;historicalVersionId?:string;historicalLessonId?:string;historicalImportId?:string;historicalCurriculumId?:string;currentVersionId?:string}
export interface CleanupReceipt {status:'PASS';deletedIntentKeys:number;baselineTables:number;dataPreserved:true}
const qi=(v:string)=>'"'+v.replaceAll('"','""')+'"';
const ql=(v:string)=>"'"+v.replaceAll("'","''")+"'";
function keyWhere(rows:OwnedRow[],alias='r'):string{return rows.length?rows.map(r=>'('+Object.entries(r.keys).map(([k,v])=>alias+'.'+qi(k)+'::text='+ql(v)).join(' AND ')+')').join(' OR '):'FALSE';}
/** Exact-key cleanup, with incoming-reference and baseline checks in the same transaction. */
export function cleanupMainFixtures(scope:MainScope,port:BootstrapSqlPort,ledger:RunLedger,baseline:TableDigest[]):CleanupReceipt{
 if(ledger.runId!==scope.environment.runId||ledger.rows.length>scope.dataPreservation.limits.totalCreatedRows||baseline.length!==97)throw Error('MAIN_CLEANUP_OWNERSHIP');
 const permitted=new Set([...scope.runtimeRole.dmlTablesInitiallyEmpty,...scope.runtimeRole.insertSelectOnlyTablesInitiallyEmpty,'User','UserSession','LearningProgram','LearningSession']);
 if(ledger.rows.some(r=>{
  if(!permitted.has(r.model))return true;const meta=model(r.model),pk=meta.primaryKey?.fields??meta.fields.filter(f=>f.isId).map(f=>f.name);
  return Object.keys(r.keys).length!==pk.length||pk.some(k=>!r.keys[k])||Object.values(r.keys).some(v=>!/^[a-zA-Z0-9-]+$/u.test(v));
 }))throw Error('MAIN_CLEANUP_OWNERSHIP');
 const groups=new Map<string,OwnedRow[]>();for(const row of ledger.rows)groups.set(row.model,[...(groups.get(row.model)??[]),row]);
 const fk=port.query<Array<{child:string;parent:string;from:string[];to:string[];nullable:boolean[]}>>(`SELECT coalesce(json_agg(x),'[]'::json) FROM (SELECT c.relname AS child,p.relname AS parent,array_agg(a.attname ORDER BY k.n) AS "from",array_agg(b.attname ORDER BY k.n) AS "to",array_agg(NOT a.attnotnull ORDER BY k.n) AS nullable FROM pg_constraint f JOIN pg_class c ON c.oid=f.conrelid JOIN pg_namespace ns ON ns.oid=c.relnamespace JOIN pg_class p ON p.oid=f.confrelid JOIN LATERAL unnest(f.conkey,f.confkey) WITH ORDINALITY k(a,b,n) ON true JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.a JOIN pg_attribute b ON b.attrelid=p.oid AND b.attnum=k.b WHERE f.contype='f' AND ns.nspname='public' GROUP BY f.oid,c.relname,p.relname) x`);
 let body='DECLARE n bigint; m bigint; BEGIN ';
 for(const [name,rows]of groups)body+=`PERFORM 1 FROM public.${qi(name)} r WHERE ${keyWhere(rows)} FOR UPDATE; `;
 for(const f of fk){const parents=groups.get(f.parent);if(!parents)continue;const own=groups.get(f.child)??[];
  const joins=f.from.map((k,i)=>'c.'+qi(k)+'=p.'+qi(f.to[i]!)).join(' AND ');
  body+=`IF EXISTS(SELECT 1 FROM public.${qi(f.child)} c JOIN public.${qi(f.parent)} p ON ${joins} WHERE (${keyWhere(parents,'p')}) AND NOT (${keyWhere(own,'c')})) THEN RAISE EXCEPTION 'MAIN_FOREIGN_REFERENCE'; END IF; `;
 }
 // Clear only nullable references on exact owned rows; no trigger/FK disabling.
 for(const f of fk){const own=groups.get(f.child);if(!own||!groups.has(f.parent))continue;const nulls=f.from.filter((_,i)=>f.nullable[i]);if(nulls.length)body+=`UPDATE public.${qi(f.child)} r SET ${nulls.map(k=>qi(k)+'=NULL').join(',')} WHERE ${keyWhere(own)}; `;}
 const remaining=new Set(groups.keys()),order:string[]=[];
 while(remaining.size){const next=[...remaining].find(parent=>!fk.some(f=>f.parent===parent&&remaining.has(f.child)&&f.child!==parent&&!f.nullable.some(Boolean)));if(!next)throw Error('MAIN_CLEANUP_DEPENDENCY');remaining.delete(next);order.push(next);}
 for(const name of order){const where=keyWhere(groups.get(name)!);body+=`SELECT count(*) INTO n FROM public.${qi(name)} r WHERE ${where}; DELETE FROM public.${qi(name)} r WHERE ${where}; GET DIAGNOSTICS m=ROW_COUNT; IF m<>n THEN RAISE EXCEPTION 'MAIN_CLEANUP_COUNT'; END IF; `;}
 for(const t of baseline){body+=`IF (SELECT count(*)::text FROM public.${qi(t.table)})<>${ql(t.count)} OR (SELECT encode(sha256(convert_to(coalesce(string_agg(encode(sha256(convert_to(to_jsonb(r)::text,'UTF8')),'hex'),'' ORDER BY encode(sha256(convert_to(to_jsonb(r)::text,'UTF8')),'hex')),''),'UTF8')),'hex') FROM public.${qi(t.table)} r)<>${ql(t.digest)} THEN RAISE EXCEPTION 'MAIN_BASELINE_MISMATCH'; END IF; `;}
 body+='END';port.query('DO $main_cleanup$ '+body+' $main_cleanup$',true);
 return {status:'PASS',deletedIntentKeys:ledger.rows.length,baselineTables:97,dataPreserved:true};
}
/** Fixtures exercise software contracts only; no claim of pedagogic or CEFR readiness. */
export async function createMainFixtures(scope:MainScope,db:PrismaService,store:LedgerStore,port:BootstrapSqlPort,fixture:FixtureDescriptor):Promise<FixtureDescriptor>{
 const f=scope.environment.filesystem,file=path.join(f.runRoot,'fixture-descriptor.json');
 writeFileSync(file,JSON.stringify(fixture),{flag:'wx'});
 const {openBeginnerHarness,attachBeginnerFixtureAudio}=await import('../integration/beginner-test-harness.js');
 const h=await openBeginnerHarness();
 try{
  const programId=fixture.target.programId;
  const pathRow=await db.learningPath.create({data:{programId,slug:'mat-goc',name:'Synthetic fixture Mất gốc',status:'PUBLISHED'}});
  await db.learningPath.create({data:{programId,slug:'co-ban',name:'Synthetic fixture Cơ bản',status:'DRAFT'}});
  const stagePlan=beginnerEditorialPlan.stages[0]!;
  const level=await db.level.create({data:{pathId:pathRow.id,code:stagePlan.code.replaceAll('-','_').toUpperCase(),name:'Synthetic MG-F0',cefrReference:'Pre-A1',order:0,status:'PUBLISHED'}});
  const units=[];
  for(const [index,code]of ['MG01','MG02'].entries()){
   const mission=await db.mission.create({data:{levelId:level.id,slug:code.toLowerCase(),title:'Synthetic '+code,objective:'Fixture contract verification only',order:index,status:'PUBLISHED'}});
   const target:BeginnerTarget={programId,pathId:pathRow.id,levelId:level.id,missionId:mission.id};
   const editorialCode=code+'-L'+(index===0?'2':'1'),tag=editorialCode.toLowerCase();
   const source=namespaceFixtureSource(syntheticBeginnerSource(),scope.environment.runId,tag);
   async function publish(rawSource:string,selectedTarget:BeginnerTarget){
    const result=await h.authoring.createDraft(h.editor,{target:selectedTarget,editorialCode,rawSource,expectedRevision:null,idempotencyKey:randomUUID()});
    const audio=await attachBeginnerFixtureAudio(h,h.editor,result.target,rawSource);
    await h.authoring.validate(h.editor,{target:result.target,expectedRevision:result.draft.draftRevision,idempotencyKey:randomUUID()});
    const review=await h.authoring.review(h.reviewer,{target:result.target,expectedRevision:result.draft.draftRevision,expectedSourceHash:result.draft.sourceHash,idempotencyKey:randomUUID(),selectedAudioArtifacts:audio});
    const published=await h.authoring.publish(h.editor,{target:result.target,expectedRevision:result.draft.draftRevision,expectedSourceHash:result.draft.sourceHash,reviewHash:review.reviewHash,idempotencyKey:randomUUID(),selectedAudioArtifacts:audio});return {result,published};
   }
   async function curriculum(lessonVersionId:string){
    const prior=await h.authoring.getFoundation(h.editor,target) as {revision:number}|null;
    const activities=await db.activity.findMany({where:{lessonVersionId},select:{slug:true,skills:true}});
    const saved=await h.authoring.foundationCommand(h.editor,'save',target,{expectedRevision:prior?.revision??null,idempotencyKey:randomUUID(),definition:{category:'grammar',objectives:[{slug:'fixture-'+scope.environment.runId+'-'+code.toLowerCase(),statement:'Synthetic four-skill evidence',skills:['reading','listening','speaking','writing'],required:true,evidence:activities.map(a=>({lessonVersionId,activitySlug:a.slug,languageBlockSlugs:[]}))}],prerequisiteRevisionIds:[]}}) as {revision:number};
    const command={expectedRevision:saved.revision,idempotencyKey:randomUUID()};await h.authoring.foundationCommand(h.editor,'validate',target,command);
    await h.authoring.foundationCommand(h.reviewer,'review',target,{...command,idempotencyKey:randomUUID()});
    return await h.authoring.foundationCommand(h.editor,'publish',target,{...command,idempotencyKey:randomUUID()}) as {id:string};
   }
   const v1=await publish(source,target);
   // Evidence is per activity, never a fabricated all-skills completion.
   const revision=await curriculum(v1.published.lessonVersionId);
   if(index===0){
    const preview=await h.authoring.learnerPreview(h.editor,v1.result.target,v1.published.lessonVersionId);
    const sessionId=randomUUID(),learnerId=fixture.learnerId!;
    await store.change(l=>l.rows.push({model:'LearningSession',keys:{id:sessionId}}));
    port.query(`INSERT INTO public."LearningSession" (id,"learnerId","clientSessionId","missionId","lessonVersionId","curriculumRevisionId","durationMinutes","planSnapshot","updatedAt") VALUES (${ql(sessionId)}::uuid,${ql(learnerId)}::uuid,${ql(randomUUID())}::uuid,${ql(mission.id)}::uuid,${ql(v1.published.lessonVersionId)}::uuid,${ql(revision.id)}::uuid,45,${ql(JSON.stringify(preview.plan))}::jsonb,CURRENT_TIMESTAMP)`,true);
    Object.assign(fixture,{target,historicalSessionId:sessionId,historicalVersionId:v1.published.lessonVersionId,historicalLessonId:v1.published.lessonId,historicalImportId:v1.result.draft.id,historicalCurriculumId:revision.id});
    fixture.historicalHashes=captureHistoricalHashes({version:await db.lessonVersion.findUniqueOrThrow({where:{id:v1.published.lessonVersionId}}),curriculum:await db.curriculumRevision.findUniqueOrThrow({where:{id:revision.id}}),snapshot:preview.plan});writeFileSync(file,JSON.stringify(fixture));
    const v2=await publish(source.replace(/^(title:.*)$/mu,'$1 V2'),{...target,lessonId:v1.published.lessonId});
    fixture.currentVersionId=v2.published.lessonVersionId;
    const c2=await curriculum(v2.published.lessonVersionId);
    units.push({missionId:mission.id,curriculumRevisionId:c2.id,lessons:[{lessonId:v2.published.lessonId,lessonVersionId:v2.published.lessonVersionId,order:1}]});
   }else units.push({missionId:mission.id,curriculumRevisionId:revision.id,lessons:[{lessonId:v1.published.lessonId,lessonVersionId:v1.published.lessonVersionId,order:1}]});
  }
  const manifest={schemaVersion:1,releaseId:'fixture-'+scope.environment.runId,programId,pathId:pathRow.id,stages:[{levelId:level.id,expectedUnitCodes:stagePlan.units.map(u=>u.code.toLowerCase()),transitionEnabled:false,units}]};
  fixture.manifest={...manifest,hash:hashBeginnerManifest(manifest)};writeFileSync(file,JSON.stringify(fixture));return fixture;
 }finally{await h.close();}
}
