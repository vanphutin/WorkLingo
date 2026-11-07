'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AssessmentResult } from '@worklingo/contracts';
import { assessmentClient } from '../../lib/api/assessment-client';
import { useT } from '../../i18n/provider';
import { assessmentMessages } from '../../i18n/messages/assessment';
import styles from './assessment-panel.module.css';
const pending=(run:AssessmentResult)=>['RECEIVED','VALIDATING','EVALUATING'].includes(run.status);
const timestamp=(ms:number)=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
function highlighted(text:string,corrections:AssessmentResult['corrections']):ReactNode[]{
 const pieces:ReactNode[]=[];let cursor=0;
 for(const c of [...corrections].sort((a,b)=>a.start-b.start)){
  if(c.start<cursor||c.end<=c.start||c.end>text.length)continue;
  pieces.push(text.slice(cursor,c.start),<mark key={`${c.start}-${c.end}`} title={c.explanation}>{text.slice(c.start,c.end)}</mark>);cursor=c.end;
 }
 pieces.push(text.slice(cursor));return pieces;
}
export function AssessmentPanel({attemptId,responseText,audioUrl,admin=false}:{attemptId:string;responseText?:string;audioUrl?:string;admin?:boolean}){
 const t=useT('assessment',assessmentMessages);
 const [runs,setRuns]=useState<AssessmentResult[]>([]),[audit,setAudit]=useState<unknown[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(false),[refresh,setRefresh]=useState(0);
 const [cancelBusy,setCancelBusy]=useState(false);
 const [historyTrusted,setHistoryTrusted]=useState(false);
 const scopeGeneration=useRef(0),actionGeneration=useRef(0),evaluating=useRef(false),cancelling=useRef(false);
 const audio=useRef<HTMLAudioElement>(null);
 useEffect(()=>{let active=true;scopeGeneration.current++;actionGeneration.current++;evaluating.current=false;cancelling.current=false;setBusy(false);setCancelBusy(false);setLoading(true);setError(false);setHistoryTrusted(false);setRuns([]);setAudit([]);
  assessmentClient.history(attemptId,admin).then(result=>{if(active){setRuns(result.items);setAudit(result.audit??[]);setHistoryTrusted(true);}}).catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;scopeGeneration.current++;actionGeneration.current++;};
 },[attemptId,admin,refresh]);
 useEffect(()=>{
  if(!busy)return;
  let active=true;let timer:ReturnType<typeof setTimeout>|undefined;
  const scope=scopeGeneration.current;
  const poll=async()=>{
   const action=actionGeneration.current;
   try{const result=await assessmentClient.history(attemptId,admin);if(active&&evaluating.current&&!cancelling.current&&scope===scopeGeneration.current&&action===actionGeneration.current){setRuns(result.items);setAudit(result.audit??[]);}}
   catch{/* The original request owns its error; a later poll may recover. */}
   if(active)timer=setTimeout(()=>void poll(),1000);
  };
  void poll();return()=>{active=false;if(timer)clearTimeout(timer);};
 },[busy,attemptId,admin]);
 const latest=[...runs].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
 async function act(cancel=false){
  if(cancel?cancelling.current||!latest:!historyTrusted||evaluating.current||cancelling.current)return;
  const scope=scopeGeneration.current,action=++actionGeneration.current;
  if(cancel){cancelling.current=true;setCancelBusy(true);}else{evaluating.current=true;setBusy(true);}
  setError(false);
  const current=()=>scope===scopeGeneration.current&&action===actionGeneration.current;
  try{const result=cancel&&latest?await assessmentClient.cancel(latest.id):await assessmentClient.evaluate(attemptId,latest?.id,admin);if(current())setRuns(previous=>[result,...previous.filter(run=>run.id!==result.id)]);}catch{if(current())setError(true);}finally{if(current()){evaluating.current=false;cancelling.current=false;setBusy(false);setCancelBusy(false);}}
 }
 return <section className={styles.panel} aria-label={t('title')}>
  <h2>{t('title')}</h2><p className={styles.note}>{t('disclosure')}</p>
  {loading?<p role="status">{t('loading')}</p>:null}
  {error?<div role="alert"><p>{t('error')}</p><button onClick={()=>setRefresh(n=>n+1)}>{t('retry')}</button></div>:null}
  {!loading?<div className={styles.actions}><button disabled={!historyTrusted||busy||cancelBusy||Boolean(latest&&pending(latest))} onClick={()=>void act()}>{busy?t('working'):latest?t('reevaluate'):t('evaluate')}</button>{latest&&pending(latest)?<button disabled={cancelBusy} onClick={()=>void act(true)}>{t('cancel')}</button>:null}<button disabled={busy||cancelBusy} onClick={()=>setRefresh(n=>n+1)}>{t('refresh')}</button></div>:null}
  {!loading&&!runs.length?<p>{t('empty')}</p>:null}
  {audioUrl?<audio ref={audio} aria-label={t('audio')} src={audioUrl} controls preload="none"/>:null}
  {runs.length?<h3>{t('history')}</h3>:null}
  {[...runs].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(run=><article className={styles.run} key={run.id}>
   <header><h3>{t(run.skill)}</h3><strong>{run.totalScore===null?t('notScored'):`${run.totalScore} / 100`}</strong></header>
   <p role="status">{t(run.status)}</p><time dateTime={run.createdAt}>{new Date(run.createdAt).toLocaleString()}</time>
   {run.providers.some(provider=>provider.synthetic)?<p>{t('synthetic')}</p>:null}
   <p>{run.feedback}</p><p>{t('confidence',{value:t(run.confidence)})}</p>
   <div className={styles.criteria}>{run.criteria.map(c=><section key={c.id} className={styles.criterion}><h4>{c.description}</h4><strong>{c.status==='SCORED'?`${c.rawScore} / ${c.maximumScore}`:t('evidenceNeeded')}</strong><p>{c.rationale}</p><p>{c.feedback}</p></section>)}</div>
   {responseText&&run.corrections.length?<><h4>{t('submission')}</h4><p className={styles.response}>{highlighted(responseText,run.corrections)}</p><h4>{t('corrections')}</h4><ul>{run.corrections.filter(c=>c.end>c.start&&c.end<=responseText.length).map((c,i)=><li key={i}><q>{responseText.slice(c.start,c.end)}</q> → <strong>{c.replacement}</strong><p>{c.explanation}</p></li>)}</ul></>:null}
   {run.evidence.length?<><h4>{t('evidence')}</h4><ul>{run.evidence.filter(e=>e.source==='submission'||e.source==='audio').map(e=><li key={e.id}><q>{e.quote}</q>{e.startMs!==null&&audioUrl?<button onClick={()=>{if(audio.current){audio.current.currentTime=e.startMs!/1000;void audio.current.play().catch(()=>undefined);}}}>{t('play',{time:timestamp(e.startMs)})}</button>:null}</li>)}</ul></>:null}
   {admin?<details><summary>{t('rubric')} / {t('provider')}</summary><p>{run.rubricId} · {run.rubricVersion} · {run.policyVersion} · {run.promptVersion}</p><p>{run.submissionId}</p>{run.providers.map((p,i)=><p key={i}>{p.role}: {p.name??t('unknown')} / {p.model??t('unknown')}</p>)}</details>:null}
  </article>)}
  {admin?<details><summary>{t('audit')}</summary><pre className={styles.audit}>{JSON.stringify(audit,null,2)}</pre></details>:null}
 </section>;
}
