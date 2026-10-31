'use client';
import {useEffect,useRef,useState} from 'react';
import {AdminLink,useAdminDraftGuard} from '../admin-dashboard/admin-navigation-guard';
import {programVersionInputSchema,type AdminProgramDto,type ProgramVersionInput,type ProgramVersionResponse,type ProgramAuthoringOptionsDto,type ProgramVersionListDto} from '@worklingo/contracts';
import {programPlatformClient as client} from '../../lib/api/program-platform-client';
import {ApiError} from '../../lib/api/api-client';
import {useT} from '../../i18n/provider';
import {programPlatformMessages} from '../../i18n/messages/programPlatform';
import {PolicyEditor,defaultProgramPolicy} from './policy-editor';
import {RevisionSelector} from './revision-selector';
import {Paging,PlatformError,useCommandKey} from './shared';
import {VocabularyPicker} from './vocabulary-picker';
const transitions={DRAFT:['IN_REVIEW'],IN_REVIEW:['DRAFT','APPROVED'],APPROVED:['IN_REVIEW','PUBLISHED'],PUBLISHED:['RETIRED'],RETIRED:[]} as const;
const initial=(p:AdminProgramDto):ProgramVersionInput=>({title:p.name,description:p.description,objectives:[p.learningGoal],difficulty:p.proficiencyLabel,estimatedMinutes:60,supportedLanguages:['en'],audiences:['adult'],policy:structuredClone(defaultProgramPolicy),curriculumBindings:[]});
function contentOf(v:Extract<ProgramVersionResponse,{source:'AUTHORED'}>):ProgramVersionInput {return {title:v.title,description:v.description,objectives:v.objectives,estimatedMinutes:v.estimatedMinutes,difficulty:v.difficulty,supportedLanguages:v.supportedLanguages,audiences:v.audiences,policy:v.policy,curriculumBindings:v.curriculumBindings,...(v.proficiencyLabel?{proficiencyLabel:v.proficiencyLabel}:{}),...(v.catalogMetadata?{catalogMetadata:v.catalogMetadata}:{})};}
export function ReleasePanel({program,onProgramChange}:{program:AdminProgramDto;onProgramChange:(program?:AdminProgramDto)=>void}){
 const t=useT('programPlatform',programPlatformMessages),key=useCommandKey();
 const [versions,setVersions]=useState<ProgramVersionListDto|null>(null),[options,setOptions]=useState<ProgramAuthoringOptionsDto|null>(null),[version,setVersion]=useState<ProgramVersionResponse|null>(null),[content,setContent]=useState(()=>initial(program));
 const [page,setPage]=useState(1),[optionPage,setOptionPage]=useState(1),[reload,setReload]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null),[stale,setStale]=useState(false),[notice,setNotice]=useState(''),[duplicateSlug,setDuplicateSlug]=useState(''),[duplicateName,setDuplicateName]=useState('');
 const [formGeneration,setFormGeneration]=useState(0);
 const [issues,setIssues]=useState<{path:string;message:string}[]>([]);const summary=useRef<HTMLDivElement>(null);const formRef=useRef<HTMLFormElement>(null);const [dirty,setDirty]=useState(false);const canLeave=useAdminDraftGuard(dirty);
 useEffect(()=>{let active=true;void Promise.all([client.versions(program.id,{page,limit:25}),client.options(program.id,{page:optionPage,limit:25})]).then(([v,o])=>{if(active){setVersions(v);setOptions(o);}}).catch(e=>{if(active)setError(e);});return()=>{active=false;};},[program.id,page,optionPage,reload]);
 const edit=(patch:Partial<ProgramVersionInput>)=>{setDirty(true);setContent(c=>({...c,...patch}));setNotice('');};
 async function load(id:string){if(busy||!canLeave())return;setBusy(true);setError(null);try{const v=await client.preview(program.id,id);setVersion(v);if(v.source==='AUTHORED')setContent(contentOf(v));setDirty(false);setStale(false);setIssues([]);setFormGeneration(v=>v+1);}catch(e){setError(e);}finally{setBusy(false);}}
 async function run(action:'save'|'transition'|'rollback'|'archive'|'duplicate',target?:ProgramVersionResponse['status']){
  if(busy)return;setBusy(true);setError(null);setNotice('');setIssues([]);
  try{
   let v:ProgramVersionResponse|undefined;
   if(action==='save'){
    const valid=programVersionInputSchema.safeParse(content);if(!valid.success){setIssues(valid.error.issues.map(i=>({path:String(i.path[0]??'title'),message:t('error')})));requestAnimationFrame(()=>summary.current?.focus());return;}
    const payload={content:valid.data,expectedRevision:version?.revision??program.revision};const command={...payload,idempotencyKey:key(`save:${program.id}:${version?.id??'new'}`,payload)};
    v=version?await client.save(program.id,version.id,command):await client.create(program.id,command);
   }else if(action==='transition'&&version&&target){const payload={expectedRevision:version.revision,targetStatus:target};v=await client.transition(program.id,version.id,{...payload,idempotencyKey:key(`transition:${version.id}`,payload)});}
   else if(action==='rollback'&&version){const payload={expectedRevision:program.revision,sourceVersionId:version.id};v=await client.rollback(program.id,{...payload,idempotencyKey:key(`rollback:${program.id}`,payload)});}
   else if(action==='archive'){const payload={expectedRevision:program.revision};onProgramChange(await client.archive(program.id,{...payload,idempotencyKey:key(`archive:${program.id}`,payload)}));}
   else if(action==='duplicate'){const payload={expectedRevision:program.revision,slug:duplicateSlug,name:duplicateName,displayOrder:program.displayOrder+1};onProgramChange(await client.duplicate(program.id,{...payload,idempotencyKey:key(`duplicate:${program.id}`,payload)}));}
   key.reset();if(v){setVersion(v);if(v.source==='AUTHORED')setContent(contentOf(v));setDirty(false);setStale(false);}setNotice(t('saved'));setReload(r=>r+1);onProgramChange();
  }catch(e){setError(e);if(e instanceof ApiError&&e.status===409)setStale(true);}finally{setBusy(false);}
 }
 const editable=!version||version.status==='DRAFT';
 return <section className="platform-panel" aria-busy={busy}><h2>{t('releases')}</h2><AdminLink href={`/admin/curriculum?programId=${program.id}`}>{t('builder')}</AdminLink><p>{t('builderNote')}</p><PlatformError error={error}/>{stale?<p role="status">{t('stale')}</p>:null}{notice?<p role="status">{notice}</p>:null}
 <button type="button" disabled={busy} onClick={()=>setReload(r=>r+1)}>{t('retry')}</button><button type="button" disabled={busy} onClick={()=>{if(!canLeave())return;key.reset();setVersion(null);setContent(initial(program));setDirty(false);setIssues([]);setFormGeneration(v=>v+1);}}>{t('newDraft')}</button>
 {versions?<><ul>{versions.items.map(v=><li key={v.id}><button disabled={busy} type="button" onClick={()=>void load(v.id)}>{t('version',{version:v.version})}</button> {t(v.status)} · {t('revision',{revision:v.revision})}</li>)}</ul><Paging page={page} total={versions.total} onChange={setPage}/></>:<p role="status">{t('loading')}</p>}
 {version?<><p>{t('version',{version:version.version})} · {t(version.status)} · {t('revision',{revision:version.revision})}</p><button disabled={busy} type="button" onClick={()=>void load(version.id)}>{t('preview')}</button>{version.source==='AUTHORED'?transitions[version.status].map(status=><button key={status} disabled={busy||dirty} type="button" onClick={()=>void run('transition',status)}>{t(status)}</button>):<p>{t('legacy')}</p>}{version.source==='AUTHORED'&&['PUBLISHED','RETIRED'].includes(version.status)?<button disabled={busy} type="button" onClick={()=>void run('rollback')}>{t('rollback')}</button>:null}</>:null}
 {version?.source==='LEGACY_PIN_BACKFILL'?null:<form ref={formRef} onSubmit={e=>{e.preventDefault();void run('save');}}>
 {issues.length?<div role="alert" tabIndex={-1} ref={summary}><p>{t('error')}</p><ul>{issues.map((i,index)=><li key={index}><a href={`#release-${i.path}`}>{i.message} ({t(i.path==='estimatedMinutes'?'minutes':i.path==='supportedLanguages'?'languages':i.path==='curriculumBindings'?'selected':i.path in programPlatformMessages.en?i.path as keyof typeof programPlatformMessages.en:'policy')})</a></li>)}</ul></div>:null}
 <fieldset disabled={busy||!editable}><div className="platform-form-grid">{(['title','description','difficulty'] as const).map(field=><label key={field}>{t(field)}<input id={`release-${field}`} required aria-invalid={issues.some(i=>i.path===field)} aria-describedby={issues.some(i=>i.path===field)?`release-${field}-error`:undefined} value={content[field]} onChange={e=>edit({[field]:e.target.value})}/>{issues.some(i=>i.path===field)?<span id={`release-${field}-error`}>{t('error')}</span>:null}</label>)}
 <label>{t('objectives')}<textarea id="release-objectives" value={content.objectives.join('\n')} onChange={e=>edit({objectives:e.target.value.split('\n')})}/></label><label>{t('minutes')}<input id="release-estimatedMinutes" type="number" min={1} max={1000000} required value={content.estimatedMinutes} onChange={e=>edit({estimatedMinutes:Number(e.target.value)})}/></label>
 {(['supportedLanguages','audiences'] as const).map(field=><label key={field}>{t(field==='supportedLanguages'?'languages':'audiences')}<input id={`release-${field}`} value={content[field].join(', ')} onChange={e=>edit({[field]:e.target.value.split(',').map(s=>s.trim())})}/></label>)}</div>
 <div id="release-policy">{issues.some(i=>i.path==='policy')?<p>{t('error')}</p>:null}<PolicyEditor key={`${version?.id??'new'}:${version?.revision??0}:${formGeneration}`} value={content.policy} onChange={policy=>edit({policy})}/></div><div id="release-curriculumBindings">{issues.some(i=>i.path==='curriculumBindings')?<p>{t('error')}</p>:null}<RevisionSelector options={options?.items??[]} value={content.curriculumBindings} onChange={curriculumBindings=>edit({curriculumBindings})}/></div>{options?<Paging page={optionPage} total={options.total} onChange={setOptionPage}/>:null}
 <VocabularyPicker bindings={content.curriculumBindings} onChange={curriculumBindings=>edit({curriculumBindings})} beginner={program.slug==='beginner'}/>
 <button type="submit">{t('saveDraft')}</button></fieldset>{!editable?<p>{t('immutable')}</p>:null}</form>}
 <details><summary>{t('duplicate')}</summary><label>{t('duplicateSlug')}<input value={duplicateSlug} onChange={e=>setDuplicateSlug(e.target.value)}/></label><label>{t('duplicateName')}<input value={duplicateName} onChange={e=>setDuplicateName(e.target.value)}/></label><button disabled={busy||!duplicateSlug||!duplicateName} type="button" onClick={()=>void run('duplicate')}>{t('duplicate')}</button></details><button disabled={busy} type="button" onClick={()=>void run('archive')}>{t('archive')}</button></section>;
}
