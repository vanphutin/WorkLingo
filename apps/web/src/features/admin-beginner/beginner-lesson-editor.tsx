'use client';
import React,{useMemo} from 'react';
import {parseLessonSource,type AstNode} from '@worklingo/content-format';
import {useT} from '../../i18n/provider';
import {adminBeginnerMessages} from '../../i18n/messages/adminBeginner';
type Action='save'|'validate'|'preview'|'review'|'publish';
interface Props{
 source:string;onSourceChange:(value:string)=>void;status?:string;persisted?:boolean;dirty?:boolean;busy?:boolean;readOnly?:boolean;
 reviewHash?:string|null;actions?:Partial<Record<Action,()=>void>>;
 audioArtifacts?:readonly {id:string;audioScriptSlug:string;status:string}[];
 selectedAudioArtifacts?:Record<string,string>;onAudioSelection?:(value:Record<string,string>)=>void;
}
interface Section{kind:string;name:string;node:AstNode;fields:readonly string[]}
export function BeginnerLessonEditor({source,onSourceChange,status='PLANNED',persisted=false,dirty=false,busy=false,readOnly=false,reviewHash=null,actions={},audioArtifacts=[],selectedAudioArtifacts={},onAudioSelection}:Props){
 const t=useT('adminBeginner',adminBeginnerMessages);
 const parsed=useMemo(()=>parseLessonSource(source),[source]),doc=parsed.document;
 const sections:Section[]=[
 ...(doc.lesson?[{kind:t('lesson'),name:'',node:doc.lesson,fields:['title','objective','duration_minutes']}]:[]),
 ...(doc.objectives??[]).map(node=>({kind:t('objective'),name:node.slug,node,fields:['statement','skills','required']})),
 ...(doc.instructions??[]).map(node=>({kind:t('instruction'),name:node.slug,node,fields:['phase','order','text']})),
 ...doc.contents.map(node=>({kind:t('content'),name:node.slug,node,fields:[]})),
 ...doc.wordBanks.map(node=>({kind:t('wordBank'),name:node.slug,node,fields:[]})),
 ...doc.audioScripts.map(node=>({kind:t('audioScript'),name:node.slug,node,fields:['speaker']})),
 ...doc.activities.map(node=>({kind:t('activity'),name:node.slug,node,fields:['learning_block','activity_type','response_type','objective_refs',...(node.activityType==='speaking'||node.activityType==='writing'?['min_words','rubric_id','rubric_version','sample_answer','prompt']:[])]})),
 ];
 const patch=(section:Section,next:string)=>onSourceChange(source.slice(0,section.node.range.start.offset)+next+source.slice(section.node.range.end.offset));
 const field=(section:Section,key:string,value:string)=>{
  const block=source.slice(section.node.range.start.offset,section.node.range.end.offset),re=new RegExp('^'+key+':[^\\r\\n]*','m'),line=key+': '+value;
  if(re.test(block))patch(section,block.replace(re,()=>line));
  else {const at=block.indexOf('\n');if(at>=0)patch(section,block.slice(0,at+1)+line+(block.includes('\r\n')?'\r\n':'\n')+block.slice(at+1));}
 };
 const refs=[...new Set(doc.activities.filter(a=>a.activityType==='listening').map(a=>a.audioRef).filter((s):s is string=>!!s))];
 const audioComplete=refs.length>0&&refs.every(ref=>!!selectedAudioArtifacts[ref]);
 return <section className="beginner-editor" aria-label={t('lesson')}>
  <p><strong>{t('status')}: {reviewHash&&!dirty?t('reviewed'):status}</strong></p>
  {!persisted?<p>{t('noDraft')}</p>:null}{dirty?<p role="status">{t('sourceChanged')}</p>:null}
  <label>{t('source')}<textarea aria-label={t('source')} value={source} spellCheck={false} rows={16} readOnly={readOnly} onChange={e=>onSourceChange(e.target.value)}/></label>
  {parsed.issues.length?<details open><summary>{t('issues')} ({parsed.issues.length})</summary><ul>{parsed.issues.slice(0,20).map((issue,i)=><li key={i}>{issue.code}: {issue.message}</li>)}</ul></details>:null}
  <details open><summary>{t('sections')}</summary>{sections.map((section,i)=>{
   const block=source.slice(section.node.range.start.offset,section.node.range.end.offset);
   return <fieldset key={section.kind+section.name+i}><legend>{section.kind} {section.name}</legend>
    {section.fields.map(key=><label key={key}>{section.kind} {section.name} · {key}<input aria-label={section.kind+' '+section.name+' · '+key} value={block.match(new RegExp('^'+key+':\\s*([^\\r\\n]*)','m'))?.[1]??''} readOnly={readOnly} onChange={e=>field(section,key,e.target.value)}/></label>)}
    <details><summary>{t('fullSection')}</summary><textarea aria-label={t('fullSection')+' '+section.kind+' '+section.name} rows={6} value={block} readOnly={readOnly} onChange={e=>patch(section,e.target.value)}/></details>
   </fieldset>;
  })}</details>
  {refs.length?<fieldset><legend>{t('selectAudio')}</legend>{refs.map(ref=><label key={ref}>{ref}<select aria-label={t('selectAudio')+' '+ref} value={selectedAudioArtifacts[ref]??''} disabled={busy||!onAudioSelection} onChange={e=>{
   const next={...selectedAudioArtifacts};if(e.target.value)next[ref]=e.target.value;else delete next[ref];onAudioSelection?.(next);
  }}><option value="">{t('missingAudio')}</option>{audioArtifacts.filter(a=>a.audioScriptSlug===ref&&a.status==='READY').map(a=><option key={a.id} value={a.id}>{ref} · {a.id}</option>)}</select></label>)}</fieldset>:null}
  <div className="beginner-actions">
   <button type="button" disabled={busy||readOnly||!actions.save||!source.trim()} onClick={actions.save}>{t('save')}</button>
   <button type="button" disabled={busy||dirty||!persisted||!actions.validate} onClick={actions.validate}>{t('validate')}</button>
   <button type="button" disabled={busy||dirty||!persisted||!actions.preview} onClick={actions.preview}>{t('preview')}</button>
   <button type="button" disabled={busy||dirty||status!=='VALIDATED'||!audioComplete||!actions.review} onClick={actions.review}>{t('review')}</button>
   <button type="button" disabled={busy||dirty||status!=='VALIDATED'||!reviewHash||!audioComplete||!actions.publish} onClick={actions.publish}>{t('publish')}</button>
  </div><p className="beginner-note">{t('technicalOnly')}</p>
 </section>;
}
