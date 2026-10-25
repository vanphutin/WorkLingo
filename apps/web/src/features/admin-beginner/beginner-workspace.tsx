'use client';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import type {BeginnerTarget,BeginnerWriteInput} from '@worklingo/contracts';
import {useT} from '../../i18n/provider';
import {adminBeginnerMessages} from '../../i18n/messages/adminBeginner';
import {beginnerAdminClient as api,type BeginnerWorkspaceData,type BeginnerImportData,type BeginnerPreviewData} from '../../lib/api/beginner-admin-client';
import {useAdminDraftGuard} from '../admin-dashboard/admin-navigation-guard';
import {FoundationDefinitionEditor} from '../admin-curriculum/foundation-definition-editor';
import {BeginnerLessonEditor} from './beginner-lesson-editor';
import {BeginnerLearnerPreview} from './beginner-learner-preview';
import './beginner.css';

export function BeginnerWorkspace(){
 const t=useT('adminBeginner',adminBeginnerMessages);
 const [workspace,setWorkspace]=useState<BeginnerWorkspaceData|null>(null),[path,setPath]=useState('mat-goc'),[code,setCode]=useState<string|null>(null);
 const [target,setTarget]=useState<BeginnerTarget|null>(null),[item,setItem]=useState<BeginnerImportData|null>(null),[source,setSource]=useState('');
 const [audio,setAudio]=useState<Record<string,string>>({}),[reviewHash,setReviewHash]=useState<string|null>(null),[version,setVersion]=useState('');
 const [preview,setPreview]=useState<BeginnerPreviewData|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[unitEditor,setUnitEditor]=useState<BeginnerTarget|null>(null);
 const request=useRef(0),dirty=source!==(item?.draft.rawSource??'');
 const canLeave=useAdminDraftGuard(dirty);
 const immutable=item?.draft.status==='PUBLISHED'||item?.draft.status==='ARCHIVED';
 const foundationClient=useMemo(()=>unitEditor?api.foundation(unitEditor):undefined,[unitEditor]);
 const load=async()=>{setError(null);try{setWorkspace(await api.workspace());}catch(e){setError(e instanceof Error?e.message:String(e));}};
 useEffect(()=>{let active=true;void api.workspace().then(value=>{if(active)setWorkspace(value);}).catch(e=>{if(active)setError(e instanceof Error?e.message:String(e));});return()=>{active=false;request.current++;};},[]);
 const allowed=(action:string)=>workspace?.actions.some(a=>a===action)??false;
 const run=async(fn:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError(null);try{await fn();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}};
 const choose=async(lessonCode:string,parent:BeginnerTarget|null)=>{
  if(busy||!canLeave())return;const serial=++request.current;
  setCode(lessonCode);setItem(null);setSource('');setReviewHash(null);setAudio({});setPreview(null);setVersion('');setUnitEditor(null);
  const binding=workspace?.bindings.find(b=>b.editorialCode===lessonCode);setTarget(binding?.target??parent);
  if(binding){setBusy(true);setError(null);try{const data=await api.getImport(binding.target);if(serial===request.current){setItem(data);setSource(data.draft.rawSource);setReviewHash(data.reviewHash);setAudio(data.selectedAudioArtifacts);}}catch(e){if(serial===request.current)setError(e instanceof Error?e.message:String(e));}finally{if(serial===request.current)setBusy(false);}}
 };
 const command=():BeginnerWriteInput=>{
  if(!target)throw new Error('Select a bound test Unit');
  return {target,expectedRevision:item?.draft.draftRevision??null,idempotencyKey:crypto.randomUUID(),selectedAudioArtifacts:audio,...(item?{expectedSourceHash:item.draft.sourceHash}:{})};
 };
 const reload=async()=>{if(!target?.importId)return;const data=await api.getImport(target);setItem(data);setSource(data.draft.rawSource);setReviewHash(data.reviewHash);setAudio(data.selectedAudioArtifacts);};
 const save=()=>run(async()=>{
  if(!target||!code||immutable)return;
  if(item){const draft=await api.updateSource({...command(),rawSource:source});setItem({...item,draft,reviewHash:null});}
  else {const created=await api.createDraft({...command(),rawSource:source,editorialCode:code});setTarget(created.target);setItem({draft:created.draft,reviewHash:null,reviewKind:null,selectedAudioArtifacts:{},audioArtifacts:[]});}
  setReviewHash(null);await load();
 });
 const planned=workspace?.plan.stages.flatMap(s=>s.units).flatMap(u=>u.lessons).find(l=>l.code===code),binding=workspace?.bindings.find(b=>b.editorialCode===code);
 const createNode=(kind:string,scope:BeginnerTarget,body:Record<string,unknown>)=>run(async()=>{await api.node(kind,scope,{...body,idempotencyKey:crypto.randomUUID()});await load();});
 return <main className="beginner-workspace" aria-busy={busy}>
  <header><h1>{t('title')}</h1><p>{t('count')}</p><p>{t('intro')}</p></header>
  {error?<div role="alert">{error}<button type="button" disabled={busy} onClick={()=>void load()}>{t('retry')}</button></div>:null}
  {!workspace?<p role="status">{t('loading')}</p>:<>
   {!workspace.writesEnabled?<p className="beginner-note">{t('permission')}</p>:null}
   <div className="beginner-actions" aria-label="Paths">{[['mat-goc','Mất gốc'],['co-ban','Cơ bản']].map(([slug,title])=><button type="button" key={slug} aria-pressed={path===slug} disabled={busy} onClick={()=>{if(canLeave()){request.current++;setPath(slug!);setCode(null);setItem(null);setSource('');setTarget(null);setPreview(null);setUnitEditor(null);}}}>{title}</button>)}</div>
   <div className="beginner-layout"><nav aria-label="Curriculum knowledge map">
    {workspace.programId&&!workspace.paths.some(p=>p.slug===path)&&allowed('author')?<button type="button" disabled={busy} onClick={()=>void createNode('create-path',{programId:workspace.programId!},{programId:workspace.programId,name:path==='mat-goc'?'Mất gốc':'Cơ bản',slug:path})}>{t('createPath')}</button>:null}
    {workspace.plan.stages.filter(s=>s.path===path).map(stage=>{
     const realPath=workspace.paths.find(p=>p.slug===path),level=realPath?.levels.find(l=>l.code===stage.code.replaceAll('-','_').toUpperCase());
     const pathTarget=workspace.programId&&realPath?{programId:workspace.programId,pathId:realPath.id}:null;
     return <details key={stage.code} open><summary>{stage.code}</summary>
      {!level&&pathTarget&&allowed('author')?<button type="button" disabled={busy} onClick={()=>void createNode('create-stage',pathTarget,{pathId:realPath!.id,code:stage.code.replaceAll('-','_').toUpperCase(),name:stage.code,cefrReference:stage.code.startsWith('MG')?'Pre-A1':'A1–A2'})}>{t('createStage')}</button>:null}
      {stage.units.map((unit,index)=>{
       const mission=level?.missions.find(m=>m.slug===unit.code.toLowerCase());
       const levelTarget=pathTarget&&level?{...pathTarget,levelId:level.id}:null,unitTarget=levelTarget&&mission?{...levelTarget,missionId:mission.id}:null;
       return <details key={unit.code}><summary>{unit.code} · {unit.title}</summary><p>{t('objective')}: {unit.canDo}</p><p>{t('prerequisite')}: {unit.hardPrerequisite}</p><p>{t('recommended')}: {unit.lessons.map(l=>l.code).join(' → ')}</p>
        {!mission&&levelTarget&&allowed('author')?<button type="button" disabled={busy} onClick={()=>void createNode('create-unit',levelTarget,{levelId:level!.id,slug:unit.code.toLowerCase(),title:unit.title,objective:unit.canDo,order:index+1,purpose:'LEARNING'})}>{t('createUnit')}</button>:null}
        {unitTarget&&allowed('read')?<button type="button" disabled={busy} onClick={()=>{if(canLeave())setUnitEditor(unitTarget);}}>{t('unitEvidence')}</button>:null}
        <ol>{unit.lessons.map(lesson=><li key={lesson.code}><button type="button" aria-current={code===lesson.code?'true':undefined} disabled={busy} onClick={()=>void choose(lesson.code,unitTarget)}>{lesson.code} · {lesson.title}</button><small>{workspace.bindings.find(b=>b.editorialCode===lesson.code)?.status??t('planned')}</small></li>)}</ol>
       </details>;
      })}
     </details>;
    })}
   </nav><section className="beginner-detail" aria-label={t('inventory')}>
    {planned?<><h2>{planned.code} · {planned.title}</h2><p><strong>{t('objective')}</strong>: {planned.objective}</p><p><strong>{t('prerequisite')}</strong>: {planned.prerequisite}</p>
     <dl>{(['grammar','pronunciation','vocabulary','reading','listening','speaking','writing'] as const).map(skill=><React.Fragment key={skill}><dt>{t(skill)}</dt><dd>{planned[skill]}</dd></React.Fragment>)}</dl>
     <details><summary>{t('resources')}</summary>{workspace.plan.videoSlots.filter(v=>v.lessonCodes.includes(planned.code)).map(v=><article key={v.code}><h3>{v.code} · {v.purpose}</h3><p>{t('notStarted')} · {v.slot}</p><p>{v.type} · {v.lessonCodes.join(', ')}</p><p>{v.outline}</p><p>{v.exercises}</p><p>{v.languageAndCaption}</p><p>{v.reuse}</p></article>)}{!workspace.plan.videoSlots.some(v=>v.lessonCodes.includes(planned.code))?<p>{t('noResources')}</p>:null}</details>
     {item?.draft.status==='PUBLISHED'&&target&&allowed('author')?<button type="button" disabled={busy} onClick={()=>{
      if(!canLeave())return;const next={...target};delete next.importId;setTarget(next);setItem(null);setReviewHash(null);setAudio({});setPreview(null);setVersion('');
     }}>{t('newDraft')}</button>:null}
     <BeginnerLessonEditor source={source} onSourceChange={value=>{setSource(value);setReviewHash(null);setPreview(null);}} status={item?.draft.status??'PLANNED'} persisted={!!item} dirty={dirty} busy={busy} readOnly={immutable||!target||!allowed('author')} reviewHash={reviewHash} audioArtifacts={item?.audioArtifacts??[]} selectedAudioArtifacts={audio} onAudioSelection={value=>{setAudio(value);setReviewHash(null);setPreview(null);}} actions={{
      ...(allowed('author')&&target&&!immutable?{save:()=>void save()}:{}),
      ...(allowed('validate')?{validate:()=>void run(async()=>{await api.validate(command());await reload();})}:{}),
      ...(allowed('read')?{preview:()=>void run(async()=>{if(target)setPreview(await api.preview(target,version||undefined,audio));})}:{}),
      ...(allowed('review')?{review:()=>void run(async()=>{const reviewed=await api.review(command());setReviewHash(reviewed.reviewHash);})}:{}),
      ...(allowed('publish')?{publish:()=>void run(async()=>{await api.publish({...command(),reviewHash:reviewHash!});await reload();await load();})}:{}),
     }}/>
     {binding?<label>{t('version')}<select value={version} disabled={busy} onChange={e=>{setVersion(e.target.value);setPreview(null);}}><option value="">{t('draftPreview')}</option>{binding.lessonVersions.filter(v=>v.status==='PUBLISHED').map(v=><option value={v.id} key={v.id}>V{v.version} · {v.id}</option>)}</select></label>:null}
     {preview&&target?<BeginnerLearnerPreview key={preview.lessonVersionId} data={preview} target={target} onClose={()=>setPreview(null)}/>:null}
    </>:<p>{t('selectLesson')}</p>}
    {unitEditor&&foundationClient?<FoundationDefinitionEditor missionId={unitEditor.missionId!} missionTitle={unitEditor.missionId!} prerequisiteOptions={workspace.paths.flatMap(p=>p.levels.flatMap(l=>l.missions.filter(m=>m.id!==unitEditor.missionId).flatMap(m=>m.curriculumRevisions.filter(r=>r.status==='PUBLISHED').map(r=>({id:r.id,label:m.title+' · V'+r.revision,title:m.title,revision:r.revision})))))} client={foundationClient} capabilities={{save:allowed('author'),validate:allowed('validate'),review:allowed('review'),publish:allowed('publish')}} onClose={()=>setUnitEditor(null)}/>:null}
   </section></div>
  </>}
 </main>;
}
