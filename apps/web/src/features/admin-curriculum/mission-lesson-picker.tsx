'use client';
import {useEffect,useState} from 'react';
import type {AdminMissionItemDto,ContentImportDto} from '@worklingo/contracts';
import {apiClient} from '../../lib/api/api-client';
import {adminCurriculumClient} from '../../lib/api/admin-curriculum-client';
import {useT} from '../../i18n/provider';
import {programPlatformMessages} from '../../i18n/messages/programPlatform';
import {Paging,PlatformError,useCommandKey} from '../program-platform/shared';
export interface EvidenceLessonOption{lessonVersionId:string;title:string;activities:readonly {slug:string;languageBlockReferences:readonly string[]}[];}
export async function loadEvidenceLessons(lessonVersionIds:readonly string[]):Promise<EvidenceLessonOption[]>{
 if(!lessonVersionIds.length)return [];
 const imports=(await apiClient.listContentImports()).filter(i=>i.status==='PUBLISHED'&&i.lessonVersionId&&lessonVersionIds.includes(i.lessonVersionId));
 const results:EvidenceLessonOption[]=[];
 for(let offset=0;offset<imports.length;offset+=25){
  const batch=await Promise.all(imports.slice(offset,offset+25).map(async (i):Promise<EvidenceLessonOption|null>=>{const preview=await apiClient.getContentPreview(i.id);return preview.normalizedDraft?{lessonVersionId:i.lessonVersionId!,title:preview.normalizedDraft.title,activities:preview.normalizedDraft.activities.map(a=>({slug:a.slug,languageBlockReferences:a.languageBlockReferences}))}:null;}));
  results.push(...batch.filter((i):i is EvidenceLessonOption=>i!==null));
 }
 return [...new Map(results.map(item=>[item.lessonVersionId,item])).values()];
}
export function MissionLessonPicker({mission,onSaved}:{mission:AdminMissionItemDto;onSaved:()=>void}){
 const t=useT('programPlatform',programPlatformMessages),key=useCommandKey();const [imports,setImports]=useState<ContentImportDto[]>([]),[options,setOptions]=useState<{id:string;title:string}[]>([]),[selected,setSelected]=useState(()=>mission.lessons.map(l=>({id:l.id,title:l.title??l.slug}))),[page,setPage]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null);
 useEffect(()=>{let active=true;void apiClient.listContentImports().then(rows=>{if(active)setImports([...new Map(rows.filter(i=>i.status==='PUBLISHED'&&i.lessonId&&i.lessonVersionId).sort((a,b)=>a.updatedAt.localeCompare(b.updatedAt)).map(i=>[i.lessonId,i])).values()]);}).catch(e=>{if(active)setError(e);});return()=>{active=false;};},[]);
 useEffect(()=>{let active=true;void Promise.all(imports.slice((page-1)*25,page*25).map(async i=>{const p=await apiClient.getContentPreview(i.id);return {id:i.lessonId!,title:p.normalizedDraft?.title??i.lessonId!};})).then(rows=>{if(active)setOptions(rows);}).catch(e=>{if(active)setError(e);});return()=>{active=false;};},[imports,page]);
 function move(index:number,delta:number){setSelected(items=>{const next=[...items];[next[index],next[index+delta]]=[next[index+delta]!,next[index]!];return next;});}
 async function save(){if(busy)return;setBusy(true);setError(null);const payload={lessonIds:selected.map(l=>l.id),expectedRevision:mission.revision};try{await adminCurriculumClient.replaceMissionLessons(mission.id,{...payload,idempotencyKey:key(`lessons:${mission.id}`,payload)});key.reset();onSaved();}catch(e){setError(e);}finally{setBusy(false);}}
 return <section className="platform-panel"><h3>{t('lessons')}</h3><PlatformError error={error}/><ul>{options.filter(o=>!selected.some(l=>l.id===o.id)).map(o=><li key={o.id}>{o.title}<button disabled={busy} type="button" aria-label={`${t('add')} ${o.title}`} onClick={()=>setSelected(items=>[...items,o])}>{t('add')}</button></li>)}</ul><Paging page={page} total={imports.length} onChange={setPage}/><ol>{selected.map((l,index)=><li key={l.id}>{l.title}<button type="button" disabled={busy||index===0} onClick={()=>move(index,-1)}>{t('up')}</button><button type="button" disabled={busy||index===selected.length-1} onClick={()=>move(index,1)}>{t('down')}</button><button type="button" disabled={busy} onClick={()=>setSelected(items=>items.filter(i=>i.id!==l.id))}>{t('remove')}</button></li>)}</ol><button type="button" disabled={busy} onClick={()=>void save()}>{t('saveChanges')}</button></section>;
}
